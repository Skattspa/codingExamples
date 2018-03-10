//Define const
const prompt = require('prompt'),    
cp = require("child_process"),    
Enquirer = require('enquirer'),    
enquirer = new Enquirer();
enquirer.register('confirm', require('prompt-confirm'));// 
Modelsvar M = require('./model/_loader').load();

var BS = require("../../service/_basic").load('Model migrate_test');// change migrate_test for migrate_model
var MM = require("./model/organization");
var MP = require("./parts/migration_parts");
var PC = require("./model/package_channels.js");

//HEADER
var colors = {    green: '\x1b[32m',   
                  red: '\x1b[31m',    
                  reset: '\x1b[0m',    
                  cyan: '\x1b[36m%s\x1b[0m'};
var schema = {   
 properties: {        
     organization_id: {            
       description: 'What organization_id of oldDB database you want to migrate?',            
       message: 'organization_id must be only numbers',            
       required: true        },        
     organization_id_check: {           
       description: 'Could you introduce the organization_id again?',            
       required: true,            
       message: 'introduce organization_id again'        }    
      }};

var questions = [{ 
   type: 'confirm',        
   name: 'Backup',        
   message: 'Do you want to create a backup?'     },   
  {        
   type: 'confirm',        
   name: 'ReImport_old_DB',      
   message: 'Do you want to reimport oldDB from the last old db production backup?'    // },   
  {        
   type: 'confirm',    // 
   name: 'happy',    //   
   message: 'Are you happy?'    // }];
  // storage organization object for status and progress of migration
              

var organization = {};
organization.id = null; // Organization ID from oldDB
organization.state = "ok"; // Overal state ok or error
organization.status = [];// status for every function // example:organization.status['query_org'] =// {"state":state, "sql" : query.sql,//"result" : JSON.stringify(result), "err":err};


// Show the header
console.log(colors.cyan, '#####################################################################################'); //cyan
console.log(colors.green, '## ', colors.red, 'v 0.0.1', colors.green, '                                                                    ##'); //green
console.log(colors.green, '## Author: Juan Madrigal & Raymond Marx                                           ##'); //green
console.log(colors.green, '##                                                                                ##'); //green
console.log(colors.green, '## This script will add a new organization                                        ##'); //green
console.log(colors.cyan, '#####################################################################################'); //cyan

//////////////////////// script starts    ////////////////////////
prompt.start();prompt.get(schema, function(err, result) {    
 console.log('newDB upgrade_organization v0.0.1');    
 console.log('organization_id ' + result.organization_id);    
 console.log('organization_id_check ' + result.organization_id_check);   
 if (result.organization_id !== result.organization_id_check) {        
  console.log('Your organization id is not correct. Please, run the script again')    
 } else {       

 // Set the organization id (old db) based on user imput        
organization.id = parseInt(result.organization_id);        // 
 enquire        enquirer.ask(questions)            
  .then(function (answers) {              
    console.log(answers)                
    organization.answers = answers;              
  
  // STEPS              

  MP.doBackup(organization)                    
  .then(MP.doImports(organization))                               // create and importing oldDB database                
  MM.query_org(organization) // Query oldDB organization from oldDB database                
  .then(MM.check_org_exist) // We check if newDB has already this organization                   
 //    EXISTS: it should fail                    
//    NOT EXISTS: continue                    
// check if reseller exists                  
  .then(MM.check_reseller_exist) 
// We check if newDB has already this reseller_id                    
//    EXISTS: go on  and store the ID                   
 // Not EXISTS: create it and store the inserted reseller id for next queries                    
 .then(MM.import_reseller)                   
 //   IF : organization.reseller_id --> import_reseller                    
//   IF: organization.reseller_id: null -->continue                    
  .then(MM.import_org)                   
  .then(MM.link_organization_reseller)                   
  .then(MM.import_locations)                    
// Customers before devices                   
 // devices are not linked to the  organization                   
  .then(MM.import_customers)                   
 // @TODO devices not attached to customers...... now neglected!!                  
  .then(MM.import_devices)                   
  .then(MM.check_reseller_packages)                  
  .then(MM.create_default_reseller_packages)                    
  // Get the subscriptions iptv and insert them into newDB                   
  .then(MM.import_service_iptv_1)                    
  // Create temporary table for packages..                   
   // And fill that table                  
  .then(MM.import_service_iptv_2)                 
  .then(MM.import_service_iptv_3)                    
  // update tariff_plan to stalker id 1 (v.5.1) and 2 (v4.8)                  
  .then(MM.setStalkerTariffPlan)                    
  //select package from newDB db                    
  //check packages_channels are already imported                 
  .then(PC.check_packages_channels)                  
  .then(PC.selectPackage1)                  
  .then(PC.selectPackage2)                  
  .then(PC.selectPackage3)                  
  .then(PC.selectPackage4)                 
  .then(PC.selectPackage5)                  
  .then(PC.selectPackage6)                  
  .then(PC.selectPackage7)                   
  // insert channels into package_channel table                    
  .then(PC.insertPackagesChannels)                  
  .then(function (organization_last) {                        
    console.log('end', organization_last);                      
    process.exit(0);                    })                  
  .catch(function (err) {                       
   // catching the error, log and exit.                        
    console.log('Catch error: ', err);                
    process.exit(0);                    
  })                 
  .done();           
 });    
}});
