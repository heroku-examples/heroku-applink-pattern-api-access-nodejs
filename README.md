# Heroku Integration - Salesforce API Access (Node.js)

## Architecture Overview

This sample application showcases how to extend a Heroku web application by integrating it with Salesforce APIs, enabling seamless data exchange and automation across multiple connected Salesforce orgs. It also includes a demonstration of the Salesforce Bulk API, which is optimized for handling large data volumes efficiently.

<img src="images/index.png" width="80%" alt="Index">

## Requirements

* Heroku login
* Heroku AppLink Pilot enabled
* Heroku CLI installed
* Heroku AppLink CLI plugin is installed
* Salesforce CLI installed
* Login information for one or more Scratch, Development or Sandbox orgs

## Local Development and Testing

You do not need to deploy your application but you do need to configure it with Heroku.

```bash
heroku create
heroku addons:create heroku-applink
heroku salesforce:authorizations:add my-org
heroku config:set CONNECTION_NAMES=my-org
heroku config:set HEROKU_APP_ID="$(heroku apps:info --json | jq -r '.app.id')"
heroku config --shell > .env
npm install
npm start
```

Navigate to `http://localhost:5006` to observe a list of accounts from the connected org.

### Multiple Org Connections

To access multiple Salesforce orgs, repeat the `salesforce:authorizations` command above with different org logins and connection names, then update the `CONNECTION_NAMES` environment variable within the `.env` file with a comma delimiated list of connection names (example shown below). The sample code will automatically query for `Account` in each org and display the results.

```
CONNECTION_NAMES=my-org,my-org-sales-a
```

### Bulk API Demo

This sample includes a demonstration of using the Salesforce Bulk API using connections formed with the Heroku Integration add-on. To see this in action obtain an org that is empty or that you are using for testing purposes only. Repeat the `salesforce:authorizations` command above using the connection name `empty-org` and then update the `CONNECTION_NAMES` environment variable within `.env` with a comma delimiated list of connection names (example shown above).

When you visit the `/bulk-demo` endpoint, the application will check for existing bulk-loaded records. If none are found, it will start an asynchronous bulk load process. You will see output in the console similar to this:

```
Starting Bulk API process for 'empty-org'
Bulk job status: {
  id: '750xx00000GtITrXXX',
  state: 'Queued',
  numberRecordsProcessed: 0,
  numberRecordsFailed: 0
}
Bulk job status: {
  id: '750xx00000GtITrXXX',
  state: 'InProgress',
  numberRecordsProcessed: 500,
  numberRecordsFailed: 0
}
Bulk job status: {
  id: '750xx00000GtITrXXX',
  state: 'JobComplete',
  numberRecordsProcessed: 1000,
  numberRecordsFailed: 0
}
Job completed successfully. Processed 1000 records
```

Once the processing has completed, refresh the home page to observe the records that have been bulk loaded. Note that to avoid duplicate inserts, the sample code checks if prior bulk inserts have been run before starting a new job.

To reset the Bulk API demo and remove the test records, run the following command using the Salesforce CLI (assuming `empty-org` is also a known `sf` CLI authorized org alias):

```bash
echo "delete [SELECT Id FROM Account WHERE Name LIKE 'Bulk Account%'];" | sf apex run -o empty-org
```

## Deploy to Heroku

```bash
heroku create
heroku addons:create heroku-applink --wait
heroku salesforce:authorizations:add my-org
heroku config:set CONNECTION_NAMES=my-org
heroku config:set HEROKU_APP_ID="$(heroku apps:info --json | jq -r '.app.id')"
git push heroku main
heroku open
```

To access multiple Salesforce orgs, repeat the `salesforce:authorizations` command above with different org logins and connection names, then update the `CONNECTION_NAMES` with a comma delimiated list of connection names. The sample code will automatically query for `Account` in each org and display the results.

## Technical Information

* Salesforce APIs are always accessed in the context of the authenticated user. This means that only the objects and fields the user has access to can be accessed by the code.
* This is a Node.js Express application, using EJS to render browser content. Other client libraries and frameworks can be used of course.
* The application uses the `@heroku/applink` package to handle Salesforce connections, authentication, and API interactions including SOQL queries and Bulk API operations.
* The sample uses a custom environment variable `CONNECTION_NAMES` to enumerate the org connections to be used by the application. However this could easily be hardcoded in your own library code, or obtained from a configuration service or other preferred means of your choice.
* The Bulk API demo intentionally showcases real-world duplicate handling scenarios. Some records may fail to insert due to Salesforce duplicate detection rules, which demonstrates proper error handling in bulk operations. Users can either accept this as a learning opportunity about integration resilience or temporarily disable duplicate rules in their Salesforce org for testing purposes. Successfully inserted records will still be visible on the main page, regardless of any duplicate-related failures.

## Other Samples

| Sample | What it covers? |
|--------|----------------|
| [Salesforce API Access - Node.js](https://github.com/heroku-examples/heroku-integration-pattern-api-access-nodejs) | This sample application showcases how to extend a Heroku web application by integrating it with Salesforce APIs, enabling seamless data exchange and automation across multiple connected Salesforce orgs. It also includes a demonstration of the Salesforce Bulk API, which is optimized for handling large data volumes efficiently. |
| [Extending Apex, Flow and Agentforce - Node.js](https://github.com/heroku-examples/heroku-integration-pattern-org-action-nodejs) | This sample demonstrates importing a Heroku application into an org to enable Apex, Flow, and Agentforce to call out to Heroku. For Apex, both synchronous and asynchronous invocation are demonstrated, along with securely elevating Salesforce permissions for processing that requires additional object or field access. |
| [Scaling Batch Jobs with Heroku - Node.js](https://github.com/heroku-examples/heroku-integration-pattern-org-job-nodejs) | This sample seamlessly delegates the processing of large amounts of data with significant compute requirements to Heroku Worker processes. |
| [Using Eventing to drive Automation and Communication](https://github.com/heroku-examples/heroku-integration-pattern-eventing-nodejs) | This sample extends the batch job sample by adding the ability to use eventing to start the work and notify users once it completes using Custom Notifications. These notifications are sent to the user's desktop or mobile device running Salesforce Mobile. Flow is used in this sample to demonstrate how processing can be handed off to low-code tools such as Flow. |
