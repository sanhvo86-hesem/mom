<?php
session_id('codextest');
session_start();
$_SESSION['user']='sanh.vo';
$_SESSION['mfa_ok']=1;
$_GET=['action'=>'dict_list'];
$_POST=[];
$_SERVER['REQUEST_METHOD']='GET';
$_SERVER['REMOTE_ADDR']='127.0.0.1';
$_SERVER['HTTP_HOST']='localhost';
$_SERVER['REQUEST_URI']='/01-QMS-Portal/api.php?action=dict_list';
chdir(__DIR__ . '/../01-QMS-Portal');
include 'api.php';