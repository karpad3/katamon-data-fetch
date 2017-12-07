'use strict';
var xray = require('x-ray')();

var tabletojson = require('tabletojson');

module.exports.get = function get(url, tableId, options) {
    tableId = tableId || 'table';
    options = options || {};
    return new Promise(function (resolve, reject) {
        xray(url, [`${tableId}@html`])(function (conversionError, tableHtmlList) {
            if (conversionError) {
                return reject(conversionError);
            }
            resolve(tableHtmlList.map(function (table) {
                return tabletojson.convert('<table>' + table + '</table>', options)[0];
            }));
        });
    });
};
