# P05 Category Dispatch Matrix

Branch: codex/uom-v5-no-guess-20260530
Current SHA before P05 commit: 45f06bd263a6f439d28f118768defc73b5fec3e9
Decision token: UOM_V5_P05_ENGINE_PRECISION_RULE_RESOLUTION_LOCKED

| category | implemented? | handler | allowed without context? | reverse allowed? | test ids |
|---|---:|---|---:|---:|---|
| identity | yes | IdentityHandler | yes | yes | testCategoryDispatchMatrixContainsEveryDbCategory |
| exact_linear | yes | LinearHandler | yes | yes | SIM-P05-01 |
| defined_linear | yes | LinearHandler | yes | yes | UoM focused suite |
| approximate_linear | yes/warn | LinearHandlerApproximate | yes | controlled | testCategoryDispatchMatrixContainsEveryDbCategory |
| affine | yes | AffineHandler | yes | explicit formula | SIM-P05-02, reverse affine |
| si_base_hop | yes | SyntheticSiHop | yes | computed | UomLifecycleResolution |
| dimensionless_strict | yes | LinearHandlerDimensionless | yes | yes | matrix coverage |
| ratio | yes | LinearHandlerRatio | yes | yes | matrix coverage |
| logarithmic | guard | UnsupportedGuard | no | no | SIM-P05-03 |
| derived_expression | guard | UnsupportedGuard | no | no | matrix coverage |
| density_based | guard/P08 | P08ContextualDensityHandler | no | no | SIM-P05-04 |
| potency_assay | guard/P08 | P08PotencyHandler | no | no | matrix coverage |
| packaging_policy | guard/P08 | P08PackagingPolicyHandler | no | no | P04 packaging guard, matrix coverage |
| arbitrary | guard | UnsupportedGuard | no | no | matrix coverage |
| device_display | guard/UI | UnsupportedGuard | no | no | matrix coverage |

REPO_EVIDENCE: The runtime source of this matrix is `ConversionEngine::CATEGORY_DISPATCH`.

TEST_EVIDENCE: `ConversionEngineP05Test::testCategoryDispatchMatrixContainsEveryDbCategory` asserts every DB category has a row.
