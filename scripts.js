/**
 * @author Juan Madrigal
 * @description This script will migrate an organization from old tvmanager system to new system,
 *              it migrates all underlaying locations, devices and customers
 *              - check if organization exists
 *              - check reseller exists
 *              - import reseller if needed
 *              - import organization
 *              - link organization to reseller
 *              - import locations of the organization
 *              - import customers
 *              - import devices
 *              - reseller packages
 *              - create default reseller packages
 *              - import iptv services
 *              - select packages
 * @example npm run organization_migration (provide tvmanager organization ID)
 */

//Define const
const prompt = require('prompt')
    , Enquirer = require('enquirer')
    , enquirer = new Enquirer()
    , enquirer.register('confirm', require('prompt-confirm'));

// Organizatio database model
const MM = require("./model/organization");

// Package channel database model
const PC = require("./model/package_channels.js");

// Migration parts collection
const MP = require("./parts/migration_parts");

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    reset: '\x1b[0m',
    cyan: '\x1b[36m%s\x1b[0m'
};

// Console question
const schema = {
    properties: {
        organization_id: {
            description: 'What organization_id of oldDB database you want to migrate?',
            message: 'Organization_id must be only numbers',
            required: true
        },
        organization_id_check: {
            description: 'Could you provide the organization_id again?',
            required: true,
            message: 'Provide organization_id again'
        }
    }
};

// Console questions/confirmations
const questions = [
    {
        type: 'confirm',
        name: 'Backup',
        message: 'Do you want to create a backup?'
    }, {
        type: 'confirm',
        name: 'ReImport_old_DB',
        message: 'Do you want to reimport oldDB from the last old db production backup?'
    }, {
        type: 'confirm',
        name: 'happy',
        message: 'Are you happy?'
    }
];

// Create organization object for status and progress of migration
var organization = {};
organization.id = null;             // Organization ID from oldDB
organization.state = "ok";          // Overall state ok or error

// Status for every function
// Example output: organization.status['query_org'] = {"state":state, "sql" : query.sql, "result" : JSON.stringify(result), "err":err};
organization.status = [];

// Show nice header
console.log(colors.cyan, '#####################################################################################'); //cyan
console.log(colors.green, '## ', colors.red, 'v 0.0.1', colors.green, '                                      ##'); //green
console.log(colors.green, '## Author: Juan Madrigal                                                          ##'); //green
console.log(colors.green, '##                                                                                ##'); //green
console.log(colors.green, '## This script will add a new organization                                        ##'); //green
console.log(colors.cyan, '#####################################################################################'); //cyan

///////////////////   script starts    ///////////////////////
prompt.start();
prompt.get(schema, function (err, result) {
    console.log('newDB upgrade_organization v0.0.1');
    console.log('organization_id ' + result.organization_id);
    console.log('organization_id_check ' + result.organization_id_check);
    if (result.organization_id !== result.organization_id_check) {
        console.log('Your organization id is not correct. Please, run the script again')
    } else {

        // Set the organization id (old db) based on user input
        organization.id = parseInt(result.organization_id);
        enquirer.ask(questions)
            .then(function (answers) {
                organization.answers = answers;

                // STEPS
                // Backup
                MP.doBackup(organization)
                .then(MP.doImports(organization));

                // Query oldDB organization from oldDB database
                MM.query_org(organization)

                // Check if newDB has already this organization
                .then(MM.check_org_exist)

                // Check if reseller exists
                .then(MM.check_reseller_exist)

                // Check if newDB has already this reseller_id
                // EXISTS: go on  and store the ID
                // Not EXISTS: create it and store the inserted reseller id for next queries
                .then(MM.import_reseller)

                // Import organization
                .then(MM.import_org)
                .then(MM.link_organization_reseller)
                .then(MM.import_locations)

                // Customers import before devices
                .then(MM.import_customers)
                .then(MM.import_devices)
                .then(MM.check_reseller_packages)
                .then(MM.create_default_reseller_packages)

                // Get the subscriptions iptv and insert them into newDB
                .then(MM.import_service_iptv_1)

                // Create temporary table for packages..
                // And fill that table
                .then(MM.import_service_iptv_2)
                .then(MM.import_service_iptv_3)

                // Update tariff_plan to stalker id 1 (v.5.1) and 2 (v4.8)
                .then(MM.setStalkerTariffPlan)

                // Select package from newDB db
                // Check if packages_channels are already imported
                .then(PC.check_packages_channels)
                .then(PC.selectPackage1)
                .then(PC.selectPackage2)
                .then(PC.selectPackage3)
                .then(PC.selectPackage4)
                .then(PC.selectPackage5)
                .then(PC.selectPackage6)
                .then(PC.selectPackage7)

                // Insert channels into package_channel table
                .then(PC.insertPackagesChannels)
                .then(function (organization_last) {

                    // Log and exit
                    console.log('end', organization_last);
                    process.exit(0);
                })
                .catch(function (err) {

                    // Catch error, log and exit.
                    console.log('Catch error: ', err);
                    process.exit(0);
                })
                .done();
            });
    }
});