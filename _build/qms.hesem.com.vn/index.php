<?php
// HESEM QMS - root redirect for subdomain deployment
// Place this file at the document root of qms.hesem.com.vn
// so users can access the portal directly via https://qms.hesem.com.vn/

header('Location: 01-QMS-Portal/portal.html');
http_response_code(302);
exit;
