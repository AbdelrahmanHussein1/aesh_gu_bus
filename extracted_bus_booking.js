/bi_bus_booking_website/static/src/js/bus_booking.js defined in bundle 'web.assets_frontend_lazy' */
odoo.define("bi_bus_booking_website.bus_booking",function(require){"use strict";var ajax=require('web.ajax');var core=require('web.core');var utils=require('web.utils');var _t=core._t;var rpc=require('web.rpc');var counter=0;$(document).ready(function(){var userName='';var userMobile='';var userEmail='';rpc.query({route:'/get_user_inf',}).then(function(res){if(res&&res.user_name){console.log(res.user_mobile)
console.log(res.user_email)
console.log(res.user_name)
userName=res.user_name;userMobile=res.user_mobile;userEmail=res.user_email;}});