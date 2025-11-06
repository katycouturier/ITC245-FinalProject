/*
   ITC-245 Final Project
   
   Author:   Haley Bishop & Katherine Couturier
   Date:     11/06/25
   
   Filename: rm_styles1.css
   
   This file contains the typographical and layout styles used in 
   the ITC245 Final Project Web page.

*/

<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "robotics";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]));
}

$sql = "SELECT robot_name, year_introduced, manufacturer, description FROM robot_history";
$result = $conn->query($sql);

$data = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
}

echo json_encode($data);
$conn->close();
?>
