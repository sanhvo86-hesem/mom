<?php
// HESEM MOM Platform - root redirect
// Redirects to the MOM portal entry point
header('Location: mom/portal.html');
http_response_code(302);
exit;
