// ## Stitches - HTML5 Sprite Sheet Generator
//
// [http://draeton.github.com/stitches](http://draeton.github.com/stitches)
//
// Copyright 2011, Matthew Cobbs
// Licensed under the MIT license.
//
/*global jQuery, Stitches, Modernizr */
(function (window, $, Modernizr) {

    "use strict";

    // ## Stitches namespace
    //
    // Holds all methods
    var S = window.Stitches = (function () {

        /* Some configuration defaults */
        var defaults = {
            "jsdir": "js",
            "prefix": "sprite",
            "padding": 10,
            "dataURI": false
        };

        /* Pub/sub subscription manager */
        var _topics = {};

        return {
            // ### init
            //
            // Readies everything for user interaction.
            //
            //     @param {jQuery} $elem A wrapped DOM node
            //     @param {Object} config An optional settings object
            init: function ($elem, config) {
                S.settings = $.extend({}, defaults, config);
                S.iconQueue = [];
                S.Page.$elem = $elem;

                /* setup subscriptions */
                S.sub("page.error",          S.Page.errorHandler);
                S.sub("page.init.done",      S.Page.fetchTemplates);
                S.sub("page.templates.done", S.Page.render);
                S.sub("page.render.done",    S.checkAPIs);
                S.sub("page.apis.done",      S.Page.bindDragAndDrop);
                S.sub("page.apis.done",      S.Page.bindButtons);
                S.sub("page.apis.done",      S.Page.bindCabinet);
                S.sub("page.apis.done",      S.Page.bindOptions);
                S.sub("page.apis.done",      S.Page.subscribe);
                S.sub("page.drop.done",      S.File.queueFiles);
                S.sub("file.queue.done",     S.File.queueIcons);
                S.sub("file.icon.done",      S.Page.addIcon);
                S.sub("file.remove.done",    S.Page.removeIcon);
                S.sub("file.unqueue",        S.File.unqueueIcon);
                S.sub("file.unqueue.all",    S.File.unqueueAllIcons);
                S.sub("sprite.generate",     S.generateStitches);

                /* notify */
                S.pub("page.init.done");
            },

            // ### sub
            //
            // Subscribe to a topic
            //
            //     @param {String} topic The subscription topic name
            //     @param {Function} fn A callback to fire
            sub: function (topic, fn) {
                var callbacks = _topics[topic] ||  $.Callbacks("stopOnFalse");
                if (fn) {
                    callbacks.add(fn);
                }
                _topics[topic] = callbacks;
            },

            // ### unsub
            //
            // Unsubscribe from a topic
            //
            //     @param {String} topic The subscription topic name
            //     @param {Function} fn A callback to remove
            unsub: function (topic, fn) {
                var callbacks = _topics[topic];
                if (callbacks) {
                    callbacks.remove(fn);
                }
            },

            // ### pub
            //
            // Publish a topic
            //
            //     @param {String} topic The subscription topic name
            pub: function (topic) {
                var callbacks = _topics[topic],
                    args = Array.prototype.slice.call(arguments, 1);
                if (callbacks) {
                    callbacks.fire.apply(callbacks, args);
                }
            },

            // ### checkAPIs
            //
            // Load supporting libraries for browsers with no native support. Uses
            // Modernizr to check for drag-and-drop, FileReader, and canvas
            // functionality.
            checkAPIs: function () {
                Modernizr.load([
                    {
                        test: typeof FileReader !== "undefined" && Modernizr.draganddrop,
                        nope: S.settings.jsdir + "/dropfile/dropfile.js"
                    },
                    {
                        test: Modernizr.canvas,
                        nope: S.settings.jsdir + "/flashcanvas/flashcanvas.js",
                        complete: function () {
                            if (typeof FileReader !== "undefined" && Modernizr.draganddrop && Modernizr.canvas) {
                                S.pub("page.apis.done");
                            } else {
                                S.pub("page.error", new Error("Required APIs are not present."));
                            }
                        }
                    }
                ]);
            },

            // ### generateStitches
            //
            // Positions all of the icons from the $filelist on the canvas;
            // crate the sprite link and the stylesheet link;
            // updates button state
            //
            //     @param {[Icon]} looseIcons An Icon array of images to place
            generateStitches: function (looseIcons) {
                var placedIcons = S.positionImages(looseIcons);
                var sprite = S.makeStitches(placedIcons);
                var stylesheet = S.makeStylesheet(placedIcons, sprite);

                /* notify */
                S.pub("sprite.generate.done", sprite, stylesheet);
            },

            // ### positionImages
            //
            // Position all of the images in the `looseIcons` array within the canvas
            //
            //     @param {[Icon]} looseIcons An Icon array of images to place
            //     @return {[Icon]} The placed images array
            positionImages: function (looseIcons) {
                var placedIcons = [];

            	/* reset position of icons */
            	$(looseIcons).each(function (idx, icon) {
            		icon.x = icon.y = 0;
            		icon.isPlaced = false;
            	});

                /* reverse sort by area */
                looseIcons = looseIcons.sort(function (a, b) {
                    if (b.area === a.area) {
                        return b.name > a.name ? 1 : -1;
                    } else {
                        return b.area - a.area;
                    }
                });

                /* find the ideal sprite for this set of icons */
                S.canvas = S.Icons.idealCanvas(looseIcons);

                /* try to place all of the icons on the ideal canvas */
                S.Icons.placeIcons(looseIcons, placedIcons, S.canvas);

                /* trim empty edges */
                S.Icons.cropCanvas(placedIcons, S.canvas);

                /* notify  and return */
                S.pub("sprite.position.done", placedIcons);
                return placedIcons;
            },

            // ### makeStitches
            //
            // Draw images on canvas
            //
            //     @param {[Icon]} The placed images array
            //     @return {String} The sprite image data URL
            makeStitches: function (placedIcons) {
                var context, data;

                /* this block often fails as a result of the cross-
                   domain blocking in browses for access to write
                   image data to the canvas */
                try {
                    context = S.canvas.getContext('2d');
                    $(placedIcons).each(function (idx, icon) {
                        context.drawImage(icon.image, icon.x, icon.y);
                    });

                    /* create image link */
                    data = S.canvas.toDataURL();
                } catch (e) {
                    S.pub("page.error", e);
                }

                /* notify  and return */
                S.pub("sprite.image.done", data);
                return data;
            },

            // ### makeStylesheet
            //
            // Create stylesheet text
            //
            //     @param {[Icon]} The placed images array
            //     @param {String} The sprite data URI string
            //     @return {String} The sprite stylesheet
            makeStylesheet: function (placedIcons, sprite) {
                /* sort by name for css output */
                placedIcons = placedIcons.sort(function (a, b) {
                    return a.name < b.name ? -1 : 1;
                });

                var prefix = S.settings.prefix;

                var backgroundImage
                if (S.settings.dataURI) {
                    backgroundImage = sprite;
                } else {
                    backgroundImage = "download.png";
                }

                var css = [
                    "." + prefix + " {",
                    "    background: url(" + backgroundImage + ") no-repeat;",
                    "}\n"
                ];

                $(placedIcons).each(function (idx, icon) {
                    css = css.concat([
                        "." + prefix + "-" + icon.name + " {",
                        "    width: " + icon.image.width + "px;",
                        "    height: " + icon.image.height + "px;",
                        "    background-position: -" + icon.x + "px -" + icon.y + "px;",
                        "}\n"
                    ]);
                });

                /* create stylesheet link */
                var data = "data:," + encodeURIComponent(css.join("\n"));

                /* notify  and return */
                S.pub("sprite.stylesheet.done", data);
                return data;
            }
        };
    })();

})(window, jQuery, Modernizr);