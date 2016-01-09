/* 
 * Copyright (c) 2015 Michel Gutierrez
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

var fs = require('fs');
var ejs = require('ejs');
var extend = require('extend');
var path = require('path');
var multipart = require('connect-multiparty');
var geoip = require('geoip-lite');
var browser = require("ua-parser");

var modPackage = require('./package');

const stylesNames = ["fontAwesome","bootstrap","bootstrapDateTimePicker","uiSelect","eas"];
const scriptsNames = ["jquery","angular","angularSanitize","bootstrap","moment","bootstrapDateTimePicker","uiSelect","eas"];

var osFamilies = {}
var browserFamilies = {}

module.exports = function(app,config) {
	
	config = extend(true,{
		path: "/eas",
		standaloneAdminUI: true,
		adminStyles: {
			fontAwesome: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/css/font-awesome.min.css",
			bootstrap: "https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/css/bootstrap.min.css",
			bootstrapDateTimePicker: "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datetimepicker/4.17.37/css/bootstrap-datetimepicker.min.css",
			uiSelect: "https://cdnjs.cloudflare.com/ajax/libs/angular-ui-select/0.13.2/select.min.css",
		},
		adminScripts: {
			jquery: "https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.4/jquery.min.js",
			angular: "https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.4.8/angular.min.js",
			angularSanitize: "https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.4.8/angular-sanitize.min.js",
			bootstrap: "https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/js/bootstrap.min.js",
			moment: "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.10.6/moment.min.js",
			bootstrapDateTimePicker: "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datetimepicker/4.17.37/js/bootstrap-datetimepicker.min.js",
			uiSelect: "https://cdnjs.cloudflare.com/ajax/libs/angular-ui-select/0.13.2/select.min.js",
		},
		staticMaxAge: '1h',
		debugDeliver: false,
		debugData: false,
		debugLiveTemplate: false,
		auth: function(req,res,next) {
			console.warn("EAS - admin interface authentication not set");
			next();
		},
		rollBacklog: 1000,
		rollExpire: 48*60*60*1000,
		adblockerDetection: true,
		files: {
			ads: __dirname + "/ads.json",
			stats: __dirname + "/stats.json",
			tmp: __dirname + "/ads/tmp",
			images: __dirname + "/ads/images",
		},
		allowedSizes: {
			"120x240": 1,
			"120x600": 1,
			"120x60": 1,
			"120x90": 1,
			"125x125": 1,
			"160x600": 1,
			"180x150": 1,
			"234x60": 1,
			"240x400": 1,
			"250x250": 1,
			"300x250": 1,
			"336x280": 1,
			"468x60": 1,
			"728x90": 1,
			"88x31": 1,
		},
		allowUpload: true,
		demoMode: false,
		demoExpire: 10*60*1000,
		demoModeDebug: false,
	},config);
	config.adminPath = config.adminPath || (config.path + "/admin");
	config.adminStyles['eas'] = config.adminPath + '/public/style.css'
	config.adminScripts['eas'] = config.adminPath + '/public/eas-client.js'

	var adminApiPath = config.adminPath + "/api";

	if(config.demoMode)
		app.use(function(req,res,next) {
			if(!req.session)
				throw new Error("EAS - No session");
			var model = null;
			if(req.session.modelId)
				model = demoModels[req.session.modelId];
			if(!model) {
				req.session.modelId = "" + Math.random();
				model = {
					model: require('./eas-model')(config,function() {
						next();
					}),
					lastUsed: Date.now(),
				}
				if(config.demoModeDebug) {
					var demoCount = 0;
					for(var id in demoModels)
						demoCount ++;
						console.info("Created demo model",req.session.modelId,req.ip,demoCount,req.headers['user-agent']);
				}
				demoModels[req.session.modelId] = model;
				req.easDemoModel = model.model;				
			} else {
				req.easDemoModel = model.model;
				next();
			}
		});
	
	app.all(config.adminPath+'*',config.auth);

	var ads = require('./eas-model')(config);
	
	var demoModels = {};
	if(config.demoMode)
		setInterval(function() {
			var now = Date.now();
			for(var m in demoModels) {
				var model = demoModels[m];
				if(now-model.lastUsed > config.demoExpire) {
					if(config.demoModeDebug)
						console.info("Expired demo model",m);
					delete demoModels[m];
				}
			}
		},60*1000);
	
	function Model(req) {
		if(config.demoMode) {
			if(!req.easDemoModel)
				throw new Error("EAS - No session");
			return req.easDemoModel; 
		} else
			return ads;
	}
	
	var styles = [];
	stylesNames.forEach(function(styleName) {
		if(config.adminStyles[styleName])
			styles.push(config.adminStyles[styleName]);
	});
	var stylesHTML = "";
	styles.forEach(function(style) {
		stylesHTML += "<link rel='stylesheet' href='"+style+"'/>\n";
	});

	var scripts = [];
	scriptsNames.forEach(function(scriptName) {
		if(config.adminScripts[scriptName])
			scripts.push(config.adminScripts[scriptName]);
	});
	var scriptsHTML = "";
	scripts.forEach(function(script) {
		scriptsHTML += "<script src='"+script+"'></script>\n";
	});

	var adminTemplate = ejs.compile(fs.readFileSync(__dirname + "/views/admin.ejs","utf-8"));
	var adminPageTemplate = ejs.compile(fs.readFileSync(__dirname + "/views/admin-page.ejs","utf-8"));
	
	function AdminTemplate(callback) {
		if(config.debugLiveTemplate) {
			if(callback) {
				fs.readFile(__dirname + "/views/admin.ejs","utf-8",function(err,data) {
					if(err) {
						console.warn("EAS - Could not read template file",err);
						callback(adminTemplate({
							config: config,
						}));
					} else {
						var template =ejs.compile(data); 
						callback(template({
							config: config,
						}));
					}
				});
			} else {
				var data = fs.readFileSync(__dirname + "/views/admin.ejs","utf-8");
				if(data) {
					var template =ejs.compile(data); 
					return template({
						config: config,
					});					
				} else
					return adminTemplate({
						config: config,
					}); 
			}
		} else {
			var data = adminTemplate({
				config: config,
			});
			if(callback)
				callback();
			return data;
		}
	}
	
	var detectAdblockerScript = 
		["\n<script>",
		"(function(d, t) {",
		"    var s = d.createElement(t); s.type = 'text/javascript'; s.async = true;",
		"    s.src = '"+config.path+"/ads/advert.js';",
		"    var r = d.getElementsByTagName(t)[0]; r.parentNode.insertBefore(s, r);",
		"  }(document, 'script'));",
		"</script>"].join("\n");
	
	function Deliver(req) {
		return function(iid,options) {
			
			var extraHtml = "";
			var adBlocker = "unsure";
			
			if(req.session) {
				if(!req.session.expressAds) {
					req.session.expressAds = {};
					if(req.easBrowser) {
						osFamilies[req.easBrowser.os.family.toLowerCase()] = req.easBrowser.os.family; 
						browserFamilies[req.easBrowser.ua.family.toLowerCase()] = req.easBrowser.ua.family; 
					}
				}
				if(config.adblockerDetection && !req.expressAdsAdbRequested) {
					if(!req.session.expressAds.adBlocker) { 
						extraHtml = detectAdblockerScript;
						req.session.expressAds.adBlocker = "yes";
						req.expressAdsAdbRequested = true;
					} else 
						adBlocker = req.session.expressAds.adBlocker;
				}
			}
			if(!req.expressAdsData)
				req.expressAdsData = {};
			var ad = Model(req).pick(iid,{
				country: req.easCountry || null,
				browser: req.easBrowser || null,
				sessHist: (req.session && req.session.expressAds) || null,
				pageHist: req.expressAdsData,
				adBlocker: adBlocker,
			});
			
			if(!ad)
				return extraHtml;
			
			if(!ad.banner && ad.inventory.nobanner=="hide")
				return extraHtml;

			function MakeLink(inside) {
				if(ad.link)
					return "<a href='"+ad.link+"' target='_blank' rel='nofollow'>"+inside+"</a>";
				else
					return "<a href='/eas/"
						+ad.inventory.id+"/"+ad.campaign.id+"/"+ad.banner.id+"/"+ad.content.id
						+"' target='_blank' rel='nofollow'>"+inside+"</a>";
			}
			
			options = options || {};
			var styles = {};
			var width, height;
			if(ad.type!='text') {
				var sizeMatch = /^([0-9]+)x([0-9]+)$/.exec(ad.inventory.size);
				if(!sizeMatch)
					return extraHtml;
				width = parseInt(sizeMatch[1]);
				height = parseInt(sizeMatch[2]);
			}
			var content;
			if(ad.banner) {
				styles=extend(styles,ad.inventory.styles,options.styles);
				if(ad.type=='image') {
					var imgHTML = "<img style='width:"+width+"px;height:"+height+"px' src='"+(ad.content.url ? ad.content.url : "/eas/images/"+ad.content.id+".png" )+"' alt='"
					+encodeURIComponent(ad.banner.alt.trim())
					+"'/></a>";
					content = MakeLink(imgHTML);
				} else if(ad.type=='text'){
					var replFound = false;
					content = ad.content.text.replace(/\[\[.*?\]\]/g,function(ph) {
						replFound = true;
						var str = ph.substr(2,ph.length-4);
						return MakeLink(str);
					});
					if(!replFound)
						content = MakeLink(ad.content.text);
				} else 
					content = ad.content;
			} else if(ad.type=='text')
				return extraHtml;
			else {
				content = "<div style='width:"+width+"px;height:"+height+"px'></div>";
				styles={
					visibility: 'hidden',
				}
			}
			
			var hasStyles=false;
			for(var s in styles) {
				hasStyles=true;
				break;
			}
			var tag=options.tag || ad.inventory.tag || (ad.type=='text'?"p":"div");
			var parts=['<'+tag];
			if(ad.inventory.classes.trim().length>0 || (options.classes && options.classes.length>0)) {
				parts.push(" class='");
				if(ad.inventory.classes.trim().length>0)
					parts.push(ad.inventory.classes.trim()+" ");
				if(options.classes && options.classes.length>0)
					parts.push(options.classes.join(" "));
				parts.push("'");
			}
			if(hasStyles) {
				var styles0=[];
				parts.push(" style='");
				for(var s in styles)
					styles0.push(s+":"+styles[s]);
				parts.push(styles0.join(";"));
				parts.push("'");
			}
			parts.push(">");
			parts.push(content);
			parts.push("</"+tag+">");
			return parts.join("")+extraHtml;
		}
	}

	/* define routes */
	if(config.standaloneAdminUI)
		app.get(config.adminPath,function(req,res) {
			AdminTemplate(function(adminUI) {
				res.send(adminPageTemplate({
					config: config,
					adminUI: AdminTemplate,
					stylesHTML: stylesHTML,
					scriptsHTML: scriptsHTML,
					version: modPackage.version,
				}));			
			});
		});
	
	app.get(config.adminPath+"/public/:file",function(req,res) {
		var filePath =  path.resolve(__dirname,"public/"+req.params.file);
		if(filePath.indexOf(__dirname+"/public/")==0)
			res.header('Cache-Control','public, max-age='+config.staticMaxAge)
				.sendFile(filePath);
		else // TODO hack attempt = block IP
			res.status(403).send("Forbidden");
	});
	
	app.get(config.path + '/:invid/:camid/:banid/:imaid',function(req,res) {
		var link = Model(req).click(req.params.invid,req.params.camid,req.params.banid,req.params.imaid);
		if(link) {
			link = link.replace("{{INV}}",req.params.invid)
				.replace("{{CAM}}",req.params.camid)
				.replace("{{BAN}}",req.params.banid)
				.replace("{{IMA}}",req.params.imaid)
				.replace("{{ALL}}",req.params.invid+"."+req.params.camid+"."+req.params.banid+"."+req.params.imaid);
			res.redirect(link);
		} else
			res.status(404).send("Not found");
	});

	app.get(config.path + '/ads/advert.js',function(req,res) {
		if(req.session) {
			req.session.expressAds = req.session.expressAds || {}
			req.session.expressAds.adBlocker = "no";
		}
		res.header("Content-Type","application/javascript")
			.header("Cache-Control","no-cache, no-store, must-revalidate")
			.header("Pragma","no-cache")
			.header("Expires","0")
			.status(200).send("");
	});

	app.get(config.path + '/images/:file',function(req,res) {
		var filePath =  path.resolve(config.files.images,req.params.file);
		if(filePath.indexOf(config.files.images)==0) {
			fs.exists(filePath,function(exists) {
				if(exists)
					res.header('Cache-Control','public, max-age='+config.staticMaxAge)
						.sendFile(filePath);
				else {
					filePath = path.resolve(config.files.tmp,req.params.file);
					if(filePath.indexOf(config.files.tmp)==0) 
						res.header('Cache-Control','public, max-age='+config.staticMaxAge)
							.sendFile(filePath);
					else
						res.status(403).send("Forbidden");
				}
			});
		} else // TODO hack attempt = block IP
			res.status(403).send("Forbidden");
	});
	
	function AdminApiCall(req,res,method) {
		method(req,function(err,data) {
			if(err) {
				console.error("Admin API error:",err);
				res.status(500).json({
					status: false,
					error: err.message
				});
			} else {
				try {
					res.json({
						status: true,
						result: data
					});
				} catch(e) {
					console.error("adminAPICall error",e,"trying to return",data);
				}
			}
		});
	}
	
	function AllowedSizes() {
		var sizes = [];
		for(var s in config.allowedSizes)
			if(config.allowedSizes[s])
				sizes.push(s);
		return sizes;
	}

	app.post(adminApiPath + '/', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			cb(null,{
				missed: Model(req).getMissedInventory(),
				ads: Model(req).getAds(),
				stats: Model(req).getStats(),
				addons: Model(req).getAddons(),
				osFamilies: osFamilies,
				browserFamilies: browserFamilies,
				now: Date.now(),
				version: modPackage.version,
				adblockerDetection: config.adblockerDetection,
				sizes: AllowedSizes(),
				allowUpload: config.allowUpload,
			});
		});		
	});

	app.post(adminApiPath + '/set-inventory', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			cb(null,{
				inventory: Model(req).setInventory(req.body.inventory),
			});
		});		
	});

	app.post(adminApiPath + '/remove-inventory', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).removeInventory(req.body.iid);
			cb(null,{});
		});		
	});

	app.post(adminApiPath + '/set-campaign', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			cb(null,{
				campaign: Model(req).setCampaign(req.body.campaign),
			});
		});		
	});

	app.post(adminApiPath + '/remove-campaign', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).removeCampaign(req.body.iid);
			cb(null,{});
		});		
	});

	app.post(adminApiPath + '/set-banner', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).setBanner(req.body.banner,function(banner) {
				cb(null,{
					banner: banner,
				});				
			});
		});		
	});

	app.post(adminApiPath + '/remove-banner', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).removeBanner(req.body.iid);
			cb(null,{});
		});		
	});

	app.post(adminApiPath + '/add-banner-image', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).addBannerImage(req.body.bid,req.body.url,false,function(err,image) {
				cb(err,{image:image});				
			});
		});		
	});

	app.post(adminApiPath + '/add-banner-image-url', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).addBannerImage(req.body.bid,req.body.url,true,function(err,image) {
				cb(err,{image:image});				
			});
		});		
	});

	app.post(adminApiPath + '/clear-stats', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).clearStats(req.body.type,req.body.id,req.body.which,function(err) {
				cb(err,{});				
			});
		});		
	});

	app.post(adminApiPath + '/active-group', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).activeGroup(req.body.type,req.body.active,req.body.ids,function(err) {
				cb(err,{});				
			});
		});		
	});

	app.post(adminApiPath + '/remove-group', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).removeGroup(req.body.type,req.body.ids,function(err) {
				cb(err,{});				
			});
		});		
	});

	app.post(adminApiPath + '/make-id', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			cb(null,Model(req).makeId());
		});		
	});

	app.post(adminApiPath + '/set-addons', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).setAddons(req.body.addons,function() {
				cb(null,{});				
			});
		});		
	});

	if(config.allowUpload)
		app.use(multipart({
		    uploadDir: config.files.tmp,
		}));

	app.post(adminApiPath + '/upload-banner-images', function(req, res) {
		AdminApiCall(req,res,function(req,cb) {
			Model(req).uploadBannerImages(req.body.bid,req.files.files,function(err,result) {
				cb(err,result);				
			});
		});
	});

	var eas = {
		deliver: Deliver,
		adminUI: AdminTemplate,
		styles: styles,
		stylesHTML: stylesHTML,
		scripts: scripts,
		scriptsHTML: scriptsHTML,
		saveStats: config.demoMode ? function(cb) { cb(); } : ads.saveStats,
	}
	
	app.expressAds = eas;

	geoip.startWatchingDataUpdate();
	
	app.use(function(req,res,next) {
		if(req.session) {
			if(req.session.easCountry===undefined) {
				var geo = geoip.lookup(req.ip);
				if(geo)
					req.session.easCountry = req.easCountry = geo.country || null; 
			} else
				req.easCountry = req.session.easCountry; 				
			if(req.session.easBrowser===undefined) {
				req.session.easBrowser = req.easBrowser = browser.parse(req.headers['user-agent']) || null; 
			} else
				req.easBrowser = req.session.easBrowser; 				
		} else {
			req.easCountry = null;
			var geo = geoip.lookup(req.ip);
			if(geo)
				req.easCountry = geo.country || null;
			req.easBrowser = browser.parse(req.headers['user-agent']) || null;
		}
		req.expressAds = eas;
		req.deliverAd = Deliver(req);
		next();		
	});
		
	return eas; 
}