let BIF = BIF || {};

const tbb = require('toolbarbutton');

const pageMod = require('sdk/page-mod');
const data = require('sdk/self').data;
const chrome = require('chrome');
const windows = require('sdk/windows').browserWindows;
const panel = require('sdk/panel');
const request = require('sdk/request').Request;
const prefSet = require('sdk/simple-prefs');

let pref403 = prefSet.prefs.alert403;
let prefDataURI = prefSet.prefs.showDataURI;
let prefFirstRun = prefSet.prefs.firstRun;

// define the prefs change callback

prefSet.on('alert403', function () {

  pref403 = prefSet.prefs.alert403;

});

prefSet.on('showDataURI', function () {

  prefDataURI = prefSet.prefs.showDataURI;

});

// panel for detail view

BIF.AddonPanel = panel.Panel({

  width: 300,
  height: 415,

  type: 'arrow',

  contentURL: data.url('bifPanel.html'),

  contentScriptFile: data.url('bifPanel.js')

});

// dial the resourceChecker-script

pageMod.PageMod({

  include: '*',

  contentScriptFile: data.url('resourceChecker.js'),

  onAttach: function (worker) {

    BIF.AddonPanel.postMessage({

      command: 'clear-panel',

      data: null

    });

    worker.port.emit('getResults');

    worker.port.on('getHTTPStatusCode', function (webResource) {

      let url = webResource[0];

      if (request && url && typeof url === 'string') {

        try {

          request({

            url: url,

            onComplete: function (response) {

              // everything else than 'found' triggers an error

              if (response.status !== 200) {

                webResource[3] = response.status;

                // optional display 403 in notification popup

                if (response.status === 403) {

                  if(pref403 === true) {

                    worker.port.emit('brokenImageFound', url);

                  }

                } else {

                  worker.port.emit('brokenImageFound', url);

                }

                BIF.AddonPanel.postMessage({

                  command: 'add-resource-info',

                  data: webResource

                });

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

      // find the toolbar button and bind the panel

      let doc, bifExtensionButton;

      doc = chrome.components.classes['@mozilla.org/appshell/window-mediator;1'].getService(chrome.components.interfaces.nsIWindowMediator).getMostRecentWindow('navigator:browser').document;

      bifExtensionButton = doc.getElementById('bif-extension');

      BIF.AddonPanel.show(bifExtensionButton);

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

// create toolbarbutton on addon load

tbb.ToolbarButton({

  id: 'bif-extension',

  label: 'Broken-Image-Finder',

  tooltiptext: 'Broken Image Finder',

  image: data.url('img/bif-logo-16.png'),

  panel: BIF.AddonPanel

});

if (prefFirstRun === false) {

  prefSet.prefs.firstRun = true;

  tbb.moveTo({

    toolbarID: 'nav-bar',

    forceMove: false // only move from palette

  })

}