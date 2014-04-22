let BIF = BIF || {};

BIF.Helper = {};

const pageMod = require('sdk/page-mod');
const data = require('sdk/self').data;
const chrome = require('chrome');
const panel = require('sdk/panel');
const request = require('sdk/request').Request;
const prefSet = require('sdk/simple-prefs');
const { ToggleButton } = require('sdk/ui/button/toggle');

// prefs
let prefNotify = prefSet.prefs.doNotify;
let prefComment = prefSet.prefs.commentedOut;
let pref403 = prefSet.prefs.alert403;
let prefDataURI = prefSet.prefs.showDataURI;

// define the prefs change callback

prefSet.on('doNotify', function () {

  prefNotify = prefSet.prefs.doNotify;

});

prefSet.on('commentedOut', function () {

  prefComment = prefSet.prefs.commentedOut;

});

prefSet.on('alert403', function () {

  pref403 = prefSet.prefs.alert403;

});

prefSet.on('showDataURI', function () {

  prefDataURI = prefSet.prefs.showDataURI;

});

// panel for detail view

BIF.AddonPanel = panel.Panel({

  width: 300,
  height: 447,

  type: 'arrow',

  onHide: function () {

    if(button) {
      button.state('window', { checked: false });
    }
  },

  contentURL: data.url('bifPanel.html'),

  contentScriptFile: data.url('bifPanel.js')

});

// toolbar button

let button = ToggleButton({

  id: 'bif-button',
  label: 'Broken Image Finder',

  icon: {
          '16' : data.url('img/tbb/icon-16.png'),
          '32' : data.url('img/tbb/icon-32.png'),
          '64' : data.url('img/tbb/icon-64.png')
        },

  badge: {
           text: '0',
           color: '#EEF1F7'
         },

  onChange: function (state) {

    if(state.checked) {

      BIF.AddonPanel.show({
        position: button
      });
    }
  }

});

// dial the resourceChecker-script

pageMod.PageMod({

  include: '*',

  contentScriptFile: data.url('resourceChecker.js'),

  onAttach: function (worker) {

    // initialize statistics

    let numberOfCheckedResources = 0;
    let numberOfHits = 0;

    // reset badge

    /*button.badge.text('0');*/

    // clear panel

    BIF.AddonPanel.postMessage({

      command: 'clear-panel',

      data: null

    });

    // transmit simple-prefs

    let transmitPrefs = [];
    transmitPrefs[0] = prefNotify;
    transmitPrefs[1] = prefComment;

    worker.port.emit('prefTransmission', transmitPrefs);

    // starting shot

    worker.port.emit('getResults');

    worker.port.on('getHTTPStatusCode', function (webResource) {

      let url = webResource[0];

      if (request && url && typeof url === 'string') {

        // inkrement the number of checked resources and send it to panel

        numberOfCheckedResources++;

        BIF.AddonPanel.postMessage({

          command: 'stats-resources',

          data: numberOfCheckedResources

        });

        try {

          request({

            url: url,

            onComplete: function (response) {

              // everything else than 'found' triggers an error

              if (response.status !== 200) {

                webResource[3] = response.status;

                // optional alert 403

                if (response.status != 403 || pref403 === true) {

                  worker.port.emit('brokenImageFound', url);

                  BIF.AddonPanel.postMessage({

                    command: 'add-resource-info',

                    data: webResource

                  });

                  // inkrement the number of strikes and send it to panel

                  numberOfHits++;

                  BIF.AddonPanel.postMessage({

                    command: 'stats-strikes',

                    data: numberOfHits

                  });

                  // set badge

                  /*button.badge.text(numberOfHits);*/

                }

              }

            }

          }).get();

        } catch (e) {

          //console.log(e);

        }

      }

    });

    worker.port.on('getResponseText', function (webResource) {

      let url = webResource[0];

      if (request && url && typeof url === 'string') {

        request({

          url: url,

          onComplete: function (response) {

            if (response.status === 200 && response.text) {

              // transmit the response.text and source

              worker.port.emit('gotResponseText', {

                responseText: response.text,

                webResource: webResource

              });

            }

          }

        }).get();

      }

    });

    // if notification popup gets clicked

    worker.port.on('showPanel', function () {

      BIF.AddonPanel.show({
        position: button
      });

    });

    // handle 'exceptions' e.g. Data-URIs

    worker.port.on('gotException', function (exceptionDetail) {

      if (exceptionDetail[1] === 'That\'s a Data-URI.') {

         if (prefDataURI === true) {

          worker.port.emit('brokenImageFound', exceptionDetail[0]);

          BIF.AddonPanel.postMessage({

            command: 'add-exception-info',

            data: exceptionDetail

          });

        }

      } else if (exceptionDetail[1] === 'Too much backward jumps.') {

        worker.port.emit('brokenImageFound', exceptionDetail[0]);

        BIF.AddonPanel.postMessage({

          command: 'add-exception-info',

          data: exceptionDetail

        });

      }

    });

  }

});