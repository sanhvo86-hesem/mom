<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use Throwable;

/**
 * Energy Dashboard controller for HESEM MOM Portal.
 *
 * Provides API endpoints for energy monitoring including overview KPIs,
 * per-machine energy detail, per-part energy calculations, and cost trends.
 *
 * Reads energy snapshots from `data/mes/` (written by MES integration).
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class EnergyController extends BaseController
{
    /** @var string Base directory for MES energy data. */
    private string $mesDir = '';

    /**
     * @return array<int, string>
     */
    private function energyReadRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'ceo',
                'production_director',
                'production_manager',
                'production_planner',
                'cnc_workshop_manager',
                'engineering_manager',
                'engineering_lead',
                'process_engineer',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'shift_leader',
                'supervisor',
                'setup_technician',
                'operator',
                'cnc_operator',
            ]
        )));
    }

    /**
     * @return void
     */
    private function requireEnergyReadAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->energyReadRoles());
    }

    // -- Helpers --------------------------------------------------------------

    /**
     * Get the MES data directory (read-only, no auto-create).
     *
     * @return string
     */
    private function mesDir(): string
    {
        if ($this->mesDir === '') {
            $this->mesDir = $this->dataDir . '/mes';
            // MES dir should already exist; create if missing for robustness
            if (!is_dir($this->mesDir)) {
                @mkdir($this->mesDir, 0755, true);
            }
        }
        return $this->mesDir;
    }

    /**
     * Load all energy snapshot records.
     *
     * Tries energy.json first, falls back to energy-snapshots.json.
     *
     * @return array
     */
    private function loadEnergyData(): array
    {
        $primary = $this->mesDir() . '/energy.json';
        $data = $this->readJsonFile($primary);
        if ($data !== null) {
            return $data;
        }

        $fallback = $this->mesDir() . '/energy-snapshots.json';
        return $this->readJsonFile($fallback) ?? [];
    }

    /**
     * Load machine registry for name lookups.
     *
     * @return array
     */
    private function loadMachines(): array
    {
        $file = $this->mesDir() . '/machines.json';
        return $this->readJsonFile($file) ?? [];
    }

    // -- Endpoints ------------------------------------------------------------

    /**
     * GET getOverview -- Energy overview KPIs with per-machine bars.
     *
     * Returns total kWh, cost, average per-part energy, and per-machine
     * breakdown suitable for bar charts.
     *
     * Query params:
     *   - date_range (string, optional): last_7d, last_30d, last_90d (default: last_30d).
     *
     * @return never
     */
    public function getOverview(): never
    {
        $user = $this->requireAuth();
        $this->requireEnergyReadAccess($user);

        try {
            $snapshots = $this->loadEnergyData();
            $machines  = $this->loadMachines();

            $dateRange = strtolower(trim($this->input('date_range', 'last_30d') ?? 'last_30d'));
            $days = match ($dateRange) {
                'last_7d'  => 7,
                'last_90d' => 90,
                default    => 30,
            };
            $cutoff = gmdate('Y-m-d', strtotime("-{$days} days"));

            // Filter by date range
            $filtered = array_filter($snapshots, function (array $s) use ($cutoff) {
                $date = $s['date'] ?? $s['timestamp'] ?? '';
                return substr($date, 0, 10) >= $cutoff;
            });

            // Aggregate per machine
            $perMachine = [];
            $totalKwh   = 0;
            $totalCost  = 0;
            $totalParts = 0;

            foreach ($filtered as $snap) {
                $machineId = $snap['machine_id'] ?? 'unknown';
                if (!isset($perMachine[$machineId])) {
                    $perMachine[$machineId] = [
                        'machine_id'   => $machineId,
                        'machine_name' => '',
                        'total_kwh'    => 0,
                        'total_cost'   => 0,
                        'parts_count'  => 0,
                        'run_hours'    => 0,
                    ];
                }

                $kwh  = (float)($snap['kwh'] ?? $snap['energy_kwh'] ?? 0);
                $cost = (float)($snap['cost'] ?? $snap['energy_cost'] ?? 0);
                $parts = (int)($snap['parts_produced'] ?? $snap['part_count'] ?? 0);
                $hours = (float)($snap['run_hours'] ?? $snap['hours'] ?? 0);

                $perMachine[$machineId]['total_kwh']   += $kwh;
                $perMachine[$machineId]['total_cost']   += $cost;
                $perMachine[$machineId]['parts_count']  += $parts;
                $perMachine[$machineId]['run_hours']    += $hours;

                $totalKwh   += $kwh;
                $totalCost  += $cost;
                $totalParts += $parts;
            }

            // Resolve machine names
            $machineMap = [];
            foreach ($machines as $m) {
                $machineMap[$m['id'] ?? $m['machine_id'] ?? ''] = $m['name'] ?? $m['machine_name'] ?? '';
            }
            foreach ($perMachine as &$pm) {
                $pm['machine_name'] = $machineMap[$pm['machine_id']] ?? $pm['machine_id'];
                $pm['total_kwh']    = round($pm['total_kwh'], 2);
                $pm['total_cost']   = round($pm['total_cost'], 2);
                $pm['kwh_per_part'] = $pm['parts_count'] > 0
                    ? round($pm['total_kwh'] / $pm['parts_count'], 3)
                    : 0;
            }
            unset($pm);

            // Sort by total_kwh descending
            $machineList = array_values($perMachine);
            usort($machineList, fn(array $a, array $b) => $b['total_kwh'] <=> $a['total_kwh']);

            $kpis = [
                'total_kwh'          => round($totalKwh, 2),
                'total_cost'         => round($totalCost, 2),
                'total_parts'        => $totalParts,
                'avg_kwh_per_part'   => $totalParts > 0 ? round($totalKwh / $totalParts, 3) : 0,
                'date_range'         => $dateRange,
                'period_days'        => $days,
                'machine_count'      => count($machineList),
            ];

            $this->success([
                'kpis'     => $kpis,
                'machines' => $machineList,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('energy_overview_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getMachineDetail -- Detailed energy data for a specific machine.
     *
     * Query params:
     *   - machine_id  (string, required)
     *   - date_range  (string, optional): last_7d, last_30d, last_90d.
     *
     * @return never
     */
    public function getMachineDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireEnergyReadAccess($user);

        $machineId = $this->input('machine_id');
        if ($machineId === null || trim($machineId) === '') {
            $this->error('missing_machine_id', 400);
        }
        $machineId = trim($machineId);

        try {
            $snapshots = $this->loadEnergyData();

            $dateRange = strtolower(trim($this->input('date_range', 'last_30d') ?? 'last_30d'));
            $days = match ($dateRange) {
                'last_7d'  => 7,
                'last_90d' => 90,
                default    => 30,
            };
            $cutoff = gmdate('Y-m-d', strtotime("-{$days} days"));

            // Filter for this machine and date range
            $filtered = array_filter($snapshots, function (array $s) use ($machineId, $cutoff) {
                if (($s['machine_id'] ?? '') !== $machineId) {
                    return false;
                }
                $date = $s['date'] ?? $s['timestamp'] ?? '';
                return substr($date, 0, 10) >= $cutoff;
            });

            // Group by date for daily trend
            $daily = [];
            $totalKwh  = 0;
            $totalCost = 0;
            $totalParts = 0;
            $totalHours = 0;

            foreach ($filtered as $snap) {
                $date = substr($snap['date'] ?? $snap['timestamp'] ?? '', 0, 10);
                if (!isset($daily[$date])) {
                    $daily[$date] = ['date' => $date, 'kwh' => 0, 'cost' => 0, 'parts' => 0, 'hours' => 0];
                }

                $kwh   = (float)($snap['kwh'] ?? $snap['energy_kwh'] ?? 0);
                $cost  = (float)($snap['cost'] ?? $snap['energy_cost'] ?? 0);
                $parts = (int)($snap['parts_produced'] ?? $snap['part_count'] ?? 0);
                $hours = (float)($snap['run_hours'] ?? $snap['hours'] ?? 0);

                $daily[$date]['kwh']   += $kwh;
                $daily[$date]['cost']  += $cost;
                $daily[$date]['parts'] += $parts;
                $daily[$date]['hours'] += $hours;

                $totalKwh   += $kwh;
                $totalCost  += $cost;
                $totalParts += $parts;
                $totalHours += $hours;
            }

            // Round daily values
            foreach ($daily as &$d) {
                $d['kwh']  = round($d['kwh'], 2);
                $d['cost'] = round($d['cost'], 2);
            }
            unset($d);

            ksort($daily);

            $detail = [
                'machine_id'       => $machineId,
                'total_kwh'        => round($totalKwh, 2),
                'total_cost'       => round($totalCost, 2),
                'total_parts'      => $totalParts,
                'total_run_hours'  => round($totalHours, 2),
                'avg_kwh_per_part' => $totalParts > 0 ? round($totalKwh / $totalParts, 3) : 0,
                'avg_kwh_per_hour' => $totalHours > 0 ? round($totalKwh / $totalHours, 3) : 0,
                'daily_trend'      => array_values($daily),
                'date_range'       => $dateRange,
            ];

            $this->success(['machine_detail' => $detail]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('energy_machine_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getPerPartEnergy -- Energy consumption per part/product.
     *
     * Groups energy data by part_id and calculates average kWh per part.
     *
     * Query params:
     *   - part_id    (string, optional): Filter to specific part.
     *   - date_range (string, optional): last_7d, last_30d, last_90d.
     *
     * @return never
     */
    public function getPerPartEnergy(): never
    {
        $user = $this->requireAuth();
        $this->requireEnergyReadAccess($user);

        try {
            $snapshots = $this->loadEnergyData();

            $dateRange = strtolower(trim($this->input('date_range', 'last_30d') ?? 'last_30d'));
            $days = match ($dateRange) {
                'last_7d'  => 7,
                'last_90d' => 90,
                default    => 30,
            };
            $cutoff = gmdate('Y-m-d', strtotime("-{$days} days"));

            $filtered = array_filter($snapshots, function (array $s) use ($cutoff) {
                $date = $s['date'] ?? $s['timestamp'] ?? '';
                return substr($date, 0, 10) >= $cutoff;
            });

            $partFilter = $this->input('part_id');
            if ($partFilter !== null && $partFilter !== '') {
                $filtered = array_filter($filtered, fn(array $s) => ($s['part_id'] ?? '') === $partFilter);
            }

            // Group by part_id
            $perPart = [];
            foreach ($filtered as $snap) {
                $partId = $snap['part_id'] ?? 'unknown';
                if ($partId === '' || $partId === 'unknown') {
                    continue;
                }

                if (!isset($perPart[$partId])) {
                    $perPart[$partId] = [
                        'part_id'      => $partId,
                        'total_kwh'    => 0,
                        'total_parts'  => 0,
                        'total_cost'   => 0,
                    ];
                }

                $perPart[$partId]['total_kwh']   += (float)($snap['kwh'] ?? $snap['energy_kwh'] ?? 0);
                $perPart[$partId]['total_parts']  += (int)($snap['parts_produced'] ?? $snap['part_count'] ?? 0);
                $perPart[$partId]['total_cost']   += (float)($snap['cost'] ?? $snap['energy_cost'] ?? 0);
            }

            // Calculate averages
            $partList = [];
            foreach ($perPart as $pp) {
                $totalKwh = round((float)$pp['total_kwh'], 2);
                $totalCost = round((float)$pp['total_cost'], 2);
                $totalParts = (int)$pp['total_parts'];
                $partList[] = [
                    'part_id' => (string)$pp['part_id'],
                    'total_kwh' => $totalKwh,
                    'total_parts' => $totalParts,
                    'total_cost' => $totalCost,
                    'kwh_per_part' => $totalParts > 0 ? round($totalKwh / $totalParts, 3) : 0.0,
                    'cost_per_part' => $totalParts > 0 ? round($totalCost / $totalParts, 4) : 0.0,
                ];
            }

            // Sort by kwh_per_part descending
            usort($partList, fn(array $a, array $b) => $b['kwh_per_part'] <=> $a['kwh_per_part']);

            $this->success([
                'per_part_energy' => $partList,
                'date_range'      => $dateRange,
                'total_parts'     => count($partList),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('energy_per_part_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getCostTrend -- Monthly energy cost trend.
     *
     * Query params:
     *   - months (int, optional): Number of months to look back (default: 12, max: 36).
     *
     * @return never
     */
    public function getCostTrend(): never
    {
        $user = $this->requireAuth();
        $this->requireEnergyReadAccess($user);

        try {
            $snapshots = $this->loadEnergyData();

            $months = min(36, max(1, (int)($this->input('months', '12'))));
            $cutoff = gmdate('Y-m-d', strtotime("-{$months} months"));

            $filtered = array_filter($snapshots, function (array $s) use ($cutoff) {
                $date = $s['date'] ?? $s['timestamp'] ?? '';
                return substr($date, 0, 10) >= $cutoff;
            });

            // Group by month
            $monthly = [];
            foreach ($filtered as $snap) {
                $date  = $snap['date'] ?? $snap['timestamp'] ?? '';
                $month = substr($date, 0, 7); // YYYY-MM
                if ($month === '') {
                    continue;
                }

                if (!isset($monthly[$month])) {
                    $monthly[$month] = [
                        'month'      => $month,
                        'total_kwh'  => 0,
                        'total_cost' => 0,
                        'parts'      => 0,
                        'run_hours'  => 0,
                    ];
                }

                $monthly[$month]['total_kwh']  += (float)($snap['kwh'] ?? $snap['energy_kwh'] ?? 0);
                $monthly[$month]['total_cost'] += (float)($snap['cost'] ?? $snap['energy_cost'] ?? 0);
                $monthly[$month]['parts']      += (int)($snap['parts_produced'] ?? $snap['part_count'] ?? 0);
                $monthly[$month]['run_hours']  += (float)($snap['run_hours'] ?? $snap['hours'] ?? 0);
            }

            // Round and sort
            foreach ($monthly as &$m) {
                $m['total_kwh']      = round($m['total_kwh'], 2);
                $m['total_cost']     = round($m['total_cost'], 2);
                $m['run_hours']      = round($m['run_hours'], 2);
                $m['cost_per_kwh']   = $m['total_kwh'] > 0
                    ? round($m['total_cost'] / $m['total_kwh'], 4)
                    : 0;
                $m['kwh_per_part']   = $m['parts'] > 0
                    ? round($m['total_kwh'] / $m['parts'], 3)
                    : 0;
            }
            unset($m);

            ksort($monthly);

            $this->success([
                'cost_trend' => array_values($monthly),
                'months'     => $months,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('energy_cost_trend_failed', 500, $e->getMessage());
        }
    }
}
