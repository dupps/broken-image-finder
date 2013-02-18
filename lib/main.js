let BIF = BIF || {};

const pageMod = require('sdk/page-mod');
const data = require('sdk/self').data;
const chrome = require('chrome');
const windows = require('sdk/windows').browserWindows;
const panel = require('sdk/panel');
const request = require('sdk/request').Request;
const userstyle = require('userstyles').load(data.url('css/tbbBadge.css'));
const prefSet = require('sdk/simple-prefs');

// prefs
let prefNotify = prefSet.prefs.doNotify;
let pref403 = prefSet.prefs.alert403;
let prefDataURI = prefSet.prefs.showDataURI;
let prefFirstRun = prefSet.prefs.firstRun;

// define the prefs change callback

prefSet.on('doNotify', function () {

  prefNotify = prefSet.prefs.doNotify;

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

  contentURL: data.url('bifPanel.html'),

  contentScriptFile: data.url('bifPanel.js')

});

// dial the resourceChecker-script

pageMod.PageMod({

  include: '*',

  contentScriptFile: data.url('resourceChecker.js'),

  onAttach: function (worker) {

    // get the toolbar button

    let doc, bifExtensionButton, numberOfCheckedResources, numberOfHits;

    doc = chrome.components.classes['@mozilla.org/appshell/window-mediator;1'].getService(chrome.components.interfaces.nsIWindowMediator).getMostRecentWindow('navigator:browser').document;

    bifExtensionButton = doc.getElementById('bif-extension');

    bifExtensionButton.setAttribute('badgeHits', '0');

    // statistics
    numberOfCheckedResources = 0;
    numberOfHits = 0;

    BIF.AddonPanel.postMessage({

      command: 'clear-panel',

      data: null

    });

    worker.port.emit('showPopup', prefNotify);

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

                // inkrement the number of strikes and send it to panel

                numberOfHits++;

                BIF.AddonPanel.postMessage({

                  command: 'stats-strikes',

                  data: numberOfHits

                });

                // badge

                /*bifExtensionButton.setAttribute('visibility', 'visible');*/

                bifExtensionButton.setAttribute('badgeHits', numberOfHits);

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

      // bind the panel to the toolbar button

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

let tbb = require("toolbarbutton").ToolbarButton({

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