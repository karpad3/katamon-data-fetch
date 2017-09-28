'use strict';
var request = require('request');
var xray = require('x-ray')();

// temporary...revert if PR to handle duplicate column headers is accepted
var tabletojson = require('tabletojson');

module.exports.get = function get(url, tableId) {
    tableId = tableId || 'table';
    return new Promise(function(resolve, reject) {
        request.get(url, function(err, response, body) {
            if (err) {
                return reject(err);
            }
            if (response.statusCode >= 400) {
                return reject(new Error('The website requested returned an error!'));
            }
            xray(body, [`${tableId}@html`])(function (conversionError, tableHtmlList) {
                if (conversionError) {
                    return reject(conversionError);
                }
                resolve(tableHtmlList.map(function(table) {
                    return tabletojson.convert('<table>' + table + '</table>')[0];
                }));
            });
        })
    });
};

