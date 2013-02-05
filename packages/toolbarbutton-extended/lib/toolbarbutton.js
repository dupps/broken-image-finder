/* ***** BEGIN LICENSE BLOCK *****
 * Version: MIT/X11 License
 * 
 * Copyright (c) 2010 Erik Vold
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Contributor(s):
 *   Erik Vold <erikvvold@gmail.com> (Original Author)
 *   Greg Parris <greg.parris@gmail.com>
 *   Evgueni Naverniouk <evgueni@globexdesigns.com>
 *   Christian Sdunek <christian.sdunek@gmail.com>
 *
 * ***** END LICENSE BLOCK ***** */

// ++++++++++++++++++++++++++++++++++++++
// content partially copied from toolbar button edit by azrafe7

// ######################################
// content partially copied from toolbar button complete by Evgueni Naverniouk


const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var {unload} = require("unload+");
var {listen} = require("listen");
var winUtils = require("window-utils");

exports.ToolbarButton = function ToolbarButton(options) {
    var unloaders = [],
        toolbarID = "",
        insertbefore = "",
        destroyed = false,
        destroyFuncs = [];

    var delegate = {
        onTrack: function (window) {
            if ("chrome://browser/content/browser.xul" != window.location || destroyed)
                return;

            let doc = window.document;
            function $(id) { return doc.getElementById(id); };
            let xul = function(type) doc.createElementNS(NS_XUL, type);
          
            // ######################################

            function createMenu(input) {
                var menu = xul("menu");
                var submenu = xul ("menupopup");
                submenu.setAttribute("id",input.id + "-popup");
                menu.setAttribute("contextmenu",submenu.id);
                input.items.forEach(function(mitem) {
                    let tbmi = xul("menuitem");
                    if (mitem) {
                        if (mitem.type == "menu"){
                            tbmi = xul("menu");
                            tbmi.setAttribute ("items", mitem.items);
                            if (mitem.onShow) {
                                tbmi.setAttribute("onpopupshowing", mitem.onShow);
                            }
                            if (mitem.onHide) {
                                tbmi.setAttribute("onpopuphideing", mitem.onHide);
                            }
                            tbmi = createMenu(mitem);
                        }
                        tbmi.setAttribute("class", "menuitem-iconic");
                        if (mitem.image) tbmi.setAttribute("image", mitem.image);
                        if (mitem.id) tbmi.setAttribute("id", mitem.id);
                        if (mitem.label) tbmi.setAttribute("label", mitem.label);
                        if (mitem.type) tbmi.setAttribute("type", mitem.type);
                        if (mitem.checked) tbmi.setAttribute("checked", mitem.checked);
                        if (mitem.tooltiptext) tbmi.setAttribute("tooltiptext", mitem.tooltiptext);
                        if (mitem.onCommand) tbmi.addEventListener("command", function(evt) {
                            mitem.onCommand(evt);
                        },true);
                    }
                    else {
                        tbmi = xul("menuseparator");
                    } 
                    submenu.appendChild(tbmi);
                });
                menu.appendChild(submenu);
                return menu;
            }

            // /######################################

            // #######################################

            // Create toolbar button
            let tbb = xul("toolbarbutton");
            tbb.setAttribute("id", options.id);
            if (options.menu) {
                tbb.setAttribute("type", "menu-button");
            } else {
                tbb.setAttribute("type", "button");
            }
            if (options.tooltiptext) tbb.setAttribute("tooltiptext", options.tooltiptext);
            if (options.image) tbb.setAttribute("image", options.image);
            tbb.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
            tbb.setAttribute("label", options.label);

            // Create toolbar button menu
            if (options.menu) {
                let tbmid = options.menu.id;
                tbb.setAttribute("contextmenu", tbmid);
            
                // Create menu popup
                let tbm = xul("menupopup");
                options.menuEl = tbm;
                tbm.setAttribute("id", tbmid);
                tbm.setAttribute("type", "menu");
                if (options.menu.position) {
                    tbm.setAttribute("position", options.menu.position);
                } else {
                    tbm.setAttribute("position", "after_start");
                }
                if (options.menu.onShow)
                    tbm.setAttribute("onpopupshowing", options.menu.onShow);   
                if (options.menu.onHide)
                    tbm.setAttribute("onpopuphidding", options.menu.onHide);
                
                options.menu.items.forEach(function(mitem) {
                    let tbmi = xul("menuitem");
                    if (mitem) {
                        if (mitem.type == "menu"){
                            tbmi.setAttribute ("items", mitem.items);
                            tbmi = createMenu(mitem);
                            tbmi.setAttribute ("type","menu");
                            if (mitem.onShow) {
                                tbmi.setAttribute("onpopupshowing", mitem.onShow);
                            }
                            if (mitem.onHide) {
                                tbmi.setAttribute("onpopuphideing", mitem.onHide);
                            }
                        } 
                        tbmi.setAttribute("class", "menuitem-iconic");
                        if (mitem.image) tbmi.setAttribute("image", mitem.image);
                        if (mitem.id) tbmi.setAttribute("id", mitem.id);
                        if (mitem.label) tbmi.setAttribute("label", mitem.label);
                        if (mitem.type) tbmi.setAttribute("type", mitem.type);
                        if (mitem.checked) tbmi.setAttribute("checked", mitem.checked);
                        if (mitem.tooltiptext) tbmi.setAttribute("tooltiptext", mitem.tooltiptext);
                        if (mitem.onCommand) tbmi.addEventListener("command", function(evt) {
                            mitem.onCommand(evt);
                        },true);
                    }
                    else {
                        tbmi = xul("menuseparator");
                    } 
                    tbm.appendChild(tbmi);
                });
                tbb.appendChild(tbm);
            }
            
            tbb.addEventListener("command", function(evt) {
                // prevent the button command if a menu entry has been selected
                if(evt.target.id !== options.id) return;

                if (options.onCommand) {
                    options.onCommand(tbb, options, evt);
                }
                
                if (options.panel) {
                    options.panel.show(tbb, options, evt);
                }
            }, true);

            // /######################################
    
            // ++++++++++++++++++++++++++++++++++++++
            
            // use this if you need to discriminate left/middle/right click
            tbb.addEventListener("click", function (evt) {
                if (options.onClick){
                    options.onClick(evt); // evt is a MouseEvent (so you can use evt.button to know which mouse button was pressed)
                    if (options.panel){
                        options.panel.show(tbb);
                    }
                }
            }, false);

            // /++++++++++++++++++++++++++++++++++++++

            // add toolbarbutton to palette
            ($("navigator-toolbox") || $("mail-toolbox")).palette.appendChild(tbb);
            
            // find a toolbar to insert the toolbarbutton into
            if (toolbarID) {
                var tb = $(toolbarID);
            }
            if (!tb) {
                var tb = toolbarbuttonExists(doc, options.id);
            }
            
            // found a toolbar to use?
            if (tb) {
                let b4;
                
                // find the toolbarbutton to insert before
                if (insertbefore) {
                    b4 = $(insertbefore);
                }
                if (!b4) {
                    let currentset = tb.getAttribute("currentset").split(",");
                    let i = currentset.indexOf(options.id) + 1;
                    
                    // was the toolbarbutton id found in the curent set?
                    if (i > 0) {
                        let len = currentset.length;
                        // find a toolbarbutton to the right which actually exists
                        for (; i < len; i++) {
                            b4 = $(currentset[i]);
                            if (b4) break;
                        }
                    }
                }
                
                tb.insertItem(options.id, b4, null, false);
            }
            
            var saveTBNodeInfo = function(e) {
                toolbarID = tbb.parentNode.getAttribute("id") || "";
                insertbefore = (tbb.nextSibling || "")
                    && tbb.nextSibling.getAttribute("id").replace(/^wrapper-/i, "");
            };
            
            window.addEventListener("aftercustomization", saveTBNodeInfo, false);
            
            // add unloader to unload+'s queue
            var unloadFunc = function() {
                tbb.parentNode.removeChild(tbb);
                window.removeEventListener("aftercustomization", saveTBNodeInfo, false);
            };
            var index = destroyFuncs.push(unloadFunc) - 1;
            listen(window, window, "unload", function() {
                destroyFuncs[index] = null;
            }, false);
            unloaders.push(unload(unloadFunc, window));
        },
    onUntrack: function (window) {}
    };
  
    var tracker = new winUtils.WindowTracker(delegate);
  
    return {
    
        // ######################################
        
            button: function() {
                for each (var window in winUtils.windowIterator()) {
                    return window.document.getElementById(options.id)
                }
            },
            
        // /######################################
        
        destroy: function() {
            if (destroyed) 
                return;
            destroyed = true;
            
            if (options.panel)
                options.panel.destroy();
            
            // run unload functions
            destroyFuncs.forEach(function(f) f && f());
            destroyFuncs.length = 0;
            
            // remove unload functions from unload+'s queue
            unloaders.forEach(function(f) f());
            unloaders.length = 0;
        },
        moveTo: function(pos) {
            if (destroyed)
                return;
            
            // record the new position for future windows
            toolbarID = pos.toolbarID;
            insertbefore = pos.insertbefore;
            
            // change the current position for open windows
            for each (var window in winUtils.windowIterator()) {
                if ("chrome://browser/content/browser.xul" != window.location) return;
                
                let doc = window.document;
                function $(id) { return doc.getElementById(id); };
                
                // if the move isn't being forced and it is already in the window, abort
                if (!pos.forceMove && $(options.id)) return;
                
                var tb = $(toolbarID);
                var b4 = $(insertbefore);
                
                // TODO: if b4 dne, but insertbefore is in currentset, then find toolbar to right
                
                if (tb) tb.insertItem(options.id, b4, null, false);
            };
        },
        
        // ++++++++++++++++++++++++++++++++++++++
    
        setIcon: function (iconUrl) {
        	for each(var window in winUtils.windowIterator()) {
				if ("chrome://browser/content/browser.xul" != window.location) return;

				let doc = window.document;
                function $(id) { return doc.getElementById(id); };
				$(options.id).setAttribute("image", iconUrl);
			}
		},
		setTooltip: function (text) {
			for each(var window in winUtils.windowIterator()) {
				if ("chrome://browser/content/browser.xul" != window.location) return;

				let doc = window.document;
                function $(id) { return doc.getElementById(id); };
				$(options.id).setAttribute("tooltiptext", text);
			}
		}
            
        // /++++++++++++++++++++++++++++++++++++++
    };
};

function toolbarbuttonExists(doc, id) {
    var toolbars = doc.getElementsByTagNameNS(NS_XUL, "toolbar");
    for (var i = toolbars.length - 1; ~i; i--) {
        if ((new RegExp("(?:^|,)" + id + "(?:,|$)")).test(toolbars[i].getAttribute("currentset")))
        return toolbars[i];
    }
    return false;
}