c2s-api
========

node wrapper around cloud2sign REST-ful APIs

All the methods have a single object parameter, used as a way to improve readability and have optional parameters.

All methods return a [Promise/A+](https://promisesaplus.com/) but accept an optional Node-style `callback(err, data)` parameter.

All methods accept a `user` parameter used to specify the user the request is made on the behalf of (to be used if and only if the authentication user is root).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->

- [`login`](#login)
- [`logout`](#logout)
- [`listWorkflows`](#listWorfkflows)
- [`downloadWorkflow`](#downloadWorkflow)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### `login`

Login to the service.

__Arguments__

* `username`: the name of the Cloud2Sign user
* `password`: the password associated to `username`

__Returns__

Full session data, with `token` to identify the session, and `user` data with `companies` info and permissions.

### `logout`

Logout from the service.

__Arguments__

* `token`: the token associated with the session

__Returns__

`logoutSuccessful` flag.

### `listWorkflows`

Retrieves the workflows list for a given company.

__Arguments__

* `token`: the token associated with the session
* `cid`: company id
* `dateMin`: the starting date for searching Workflow (mandatory), in "milliseconds since Unix Epoch" format
* `dateMax`: the ending date for searching Workflow, in "milliseconds since Unix Epoch" format
* `meta`: optional metadata for searching

__Returns__

Workflows list. 

### `downloadWorkflow`

Retrieves a Buffer with the content of a workflow.

__Arguments__

* `token`: the token associated with the session
* `wfid`: the workflow id to be downloaded

__Returns__

Full workflow data (in zip format)