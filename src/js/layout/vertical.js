/**
 * # layout/vertical
 *
 * Constructor for the vertical canvas layout manager. Used to determine
 * canvas dimensions and to place sprites without intersections (overlap).
 * Places sprites in a vertical column
 *
 * > http://draeton.github.io/stitches<br/>
 * > Copyright 2013 Matthew Cobbs<br/>
 * > Licensed under the MIT license.
 */

define([
    "wrap/jquery",
    "util/util",
    "layout/base"
],
function ($, util, BaseLayout) {

    "use strict";

    var defaults = {
        maxPass: 2 // number of tries to place sprite
    };

    /**
     * ## VerticalLayout
     * Create a new `VerticalLayout` instance
     *
     * @constructor
     * @param {object} options
     */
    var VerticalLayout = function (options) {
        this.settings = $.extend({}, defaults, options);
    };

    util.inherit(VerticalLayout, BaseLayout, {
        /**
         * ### @getDimensions
         * Returns an object with the width and height necessary
         * to contain the `sprites`. Calculation based on adding all of the
         * sprite heights.
         *
         * @param {array} sprites The list of sprites to size for
         * @param {object} defaults Default width and height, if no sprites
         * @return object
         */
        getDimensions: function (sprites, defaults) {
            var width = 0;
            var height = 0;

            var rows = this.rowlimit || 0,
                cols = 0,
                minheight = 0, 
                i = 0, 
                j =0;
                
            if(rows>0 && rows<sprites.length) {
                cols = Math.ceil(sprites.length/rows);
                for(i=0; i<cols; i++) {
                    for(j=0; j<rows; j++) {
                        if(sprites[i*rows+j]) {
                            minheight += sprites[i*rows+j].height; 
                            width += sprites[i*rows+j].width;
                        }
                    }
                    height = Math.max(height, minheight);
                    minheight = 0;    
                }
            }
            else $.map(sprites, function (sprite) {
                width = sprite.width > width ? sprite.width : width;
                height += sprite.height;
            });
console.log(width, height, sprites.length, this.rowlimit);
            return {
                width: width || defaults.width,
                height: height || defaults.height
            };
        },

        /**
         * ### @placeSprite
         * Determine sprite coordinates on the canvas. Once a position is
         * determined with no intersections, the sprite is added to the
         * placed array. If there is no space, the dimensions are updated.
         * Seeks down to place the sprite.
         *
         * @param {Sprite} sprite The sprite to place
         * @param {array} placed An array of sprites already placed
         * @param {object} dimensions The current canvas dimensions
         */
        placeSprite: function (sprite, placed, dimensions) {
            var intersection;
            var pass = 0;
            var x = 0;
            var y = 0;
console.log(sprite.name);
            while (pass++ < this.settings.maxPass) {
                for (x = 0; x <= dimensions.width - sprite.width; x++) {
                    for (y = 0; y <= dimensions.height - sprite.height; y++) {
                        sprite.x = x;
                        sprite.y = y;

                        intersection = this.intersection(sprite, placed);
console.log("-",$(intersection).attr("name"));
                        if (!intersection) {
                            placed.push(sprite);
                            sprite.show();
                            return true;
                        }
                        
                        y = intersection.y + intersection.height - 1;
                    }
                    
                    x = intersection.x + intersection.width - 1;
                }

                dimensions.width += sprite.width;
                dimensions.height += sprite.height;
            }

            return false;
        },
        
        /**
         * ### @isLimitable
         * Returns whether rows/colums in layout are limitable
         */
        isLimitable : function() {
            return true;
        },
        
        /**
         * ### @setLimit
         * Limit the number of rows
         */
        setLimit : function(limit) {
            this.rowlimit = limit;
        }
    });

    return VerticalLayout;

});
