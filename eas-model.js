/* 
 * Copyright (c) 2015 Michel Gutierrez
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

var fs = require('fs');
var request = require('request');
var path = require("path");
var extend = require("extend");
var ejs = require('ejs');
var crypto = require('crypto');

const periodTypes = { 
	'click': { type: 'click' },
	'impr': { type: 'impr' },
	'clickperminute': { type:'click', duration:60*1000 },
	'clickperhour': { type:'click', duration:60*60*1000 },
	'clickperday': { type:'click', duration:24*60*60*1000 },
	'clickperweek': { type: 'click', duration: 7*24*60*60*1000 },
	'clickpermonth': { type: 'click', duration : 30*24*60*60*1000 }, 
	'imprperminute': { type: 'impr', duration: 60*1000 }, 
	'imprperhour': { type: 'impr', duration: 60*60*1000 }, 
	'imprperday': { type: 'impr', duration: 24*60*60*1000 }, 
	'imprperweek': { type: 'impr', duration: 7*24*60*60*1000 },
	'imprpermonth': { type: 'impr', duration: 30*24*60*60*1000 }
};

const SIZE_RE = new RegExp("^([0-9]+)x([0-9]+)$");

module.exports = function(config, callback) {
	
	var exports = {};

	var adsEmpty = {
		inventory: {
		},
		campaign: {
		},
		banner: {
		},
		addons: {
		},
	}
	var ads = extend(true,{},adsEmpty);
	var statsEmpty = {
		total: {
			inv: { impr: {}, click: {} },
			cam: { impr: {}, click: {} },
			ban: { impr: {}, click: {} },
			ima: { impr: {}, click: {} },
		},
		week: {
			duration: 7*24*60*60*1000,
			inv: {  
				/* [id] = {
					last: { impr: 0, click: 0 },
					lastStart: 0,
					lastEnd: 0,
					current: { impr: 0, click: 0 },
				} */
			},
			cam: {  }, ban: {  }, ima: {  } 
		},
		day: { duration: 24*60*60*1000, inv: { }, cam: { }, ban: { }, ima: {  } },
		hour: { duration: 60*60*1000, inv: { }, cam: { }, ban: { }, ima: {  } },
		period: { impr: {}, click: {} },
		periodDraw: {},
		periodTime: {},
		roll: {
			/* [inventoryId] = {
					last: { campaign.id: campaign.count },
					lastCount: 0,
					lastStart: 0,
					lastEnd: 0,
					current: { campaign.id: campaign.count },
					currentCount: 0,
				} */
		}
	}
	var stats = extend(true,{},statsEmpty);
	var exports = {};
	var addons = {};
	var addonTemplates = {};
	
	var easContrib = true; // mail contact@aclap.com to prevent eas shared contribution while keeping fair
	if(config.contribFree && crypto.createHash("sha256").update(config.contribFree).digest("hex")==
		"b317ee0f7392d032f4577422eb737ad3c26cdefa53d4a0037cadc1aaaf0148a7")
		easContrib = false;
		
	(config.addons || []).forEach(function(addon) {
		addonTemplates[addon.name] = ejs.compile(addon.template);
		addons[addon.name] = addon;
	});
	
	var gm;
	if(config.imageMagick)
		gm = require("gm").subClass({imageMagick: true});
	else
		gm = require("gm");
	
	function PurgeTmp() {
		fs.readdir(config.files.tmp+"/",function(err,files) {
			if(err)
				return console.warn("Could not read tmp directory:",err);
			var now = Date.now();
			files.forEach(function(file) {
				if(file=='.gitignore' || file=='keepalive')
					return;
				var path = config.files.tmp+"/"+file;
				fs.stat(path,function(err,stats) {
					if(err)
						return console.warn("Could not read stat for file",path,":",err);
					if(now-stats.mtime.getTime()>24*60*60*1000)
						fs.unlink(path,function(err) {
							if(err)
								return console.warn("Could not unlink file",path,":",err);						
						});
				});
			});
		});
	}
	PurgeTmp();
	setInterval(PurgeTmp,60*60*1000);
	
	MakeShortId = function() {
		var b = "aA0";
		var r = [];
		for(var i=0;i<5;i++) {
			var v = Math.floor(Math.random()*62);
			if(v<26)
				r.push(String.fromCharCode(b.charCodeAt(0)+v));
			else if(v<52)
				r.push(String.fromCharCode(b.charCodeAt(1)+v-26));
			else
				r.push(String.fromCharCode(b.charCodeAt(2)+v-52));
		}
		return r.join("");
	}
	
	function EnsuresCampaignIntegrity(campaign) {
		var periodType = periodTypes[campaign.type];
		if(periodType) {
			var cid = campaign.id;
			var now = Date.now();
			if(!stats.periodTime[cid] || stats.periodDraw[cid]===undefined || stats.period[periodType.type][cid]===undefined) {
				stats.periodTime[cid] = now;
				stats.periodDraw[cid] = 0;
				stats.period.impr[cid] = 0;
				stats.period.click[cid] = 0;
				Updated('stats');
			}
			if(periodType.duration) {
				while(stats.periodTime[cid]+periodType.duration<now) {
					stats.periodTime[cid] += +periodType.duration;
					//console.info("Campaign",campaign.hid,"expired on",new Date(stats.periodTime[cid]),
					//		"clicks",stats.period.impr[cid],"imprs",stats.period.impr[cid],"draws",stats.periodDraw[cid]);
					stats.periodDraw[cid] = 0;
					stats.period.impr[cid] = 0;				
					stats.period.click[cid] = 0;				
					Updated('stats');
				}
			}
		}
	} 
	
	function IncrStatsInstant(type,what,id,periodName) {
		var now = Date.now();
		var duration = stats[periodName].duration;
		var instant = stats[periodName][what][id];
		if(!instant)
			instant = stats[periodName][what][id] = {
				last: { impr: 0, click: 0 },
				lastStart: now,
				lastEnd: now,
				current: { impr: 0, click: 0 },
			}
		if(instant.lastEnd + duration < now) {
			instant.lastStart = instant.lastEnd;
			instant.lastEnd = now;
			instant.last = instant.current;
			instant.current = { impr: 0, click: 0 };
		}
		instant.current[type] ++;
	}
	
	function IncrStats(type,what,id) {
		stats.total[what][type][id] = (stats.total[what][type][id] || 0) + 1;
		if(what=='cam') {
			var campaign = ads.campaign[id];
			if(campaign) {
				EnsuresCampaignIntegrity(campaign);
				stats.period[type][campaign.id]++;
			}
		}
		IncrStatsInstant(type,what,id,'week');
		IncrStatsInstant(type,what,id,'day');
		IncrStatsInstant(type,what,id,'hour');
		Updated('stats');
	}
	
	function AddRoll(iid,cid) {
		var now = Date.now();
		var roll = stats.roll[iid]; 
		if(!roll)
			stats.roll[iid] = roll = {
				last: { },
				lastCount: 0,
				lastStart: now,
				lastEnd: now,
				current: { },
				currentCount: 0,
			}
		roll.lastHitTime = now;
		roll.current[cid] = (roll.current[cid] || 0) + 1;
		roll.currentCount ++;
		if(roll.currentCount>=config.rollBacklog) {
			roll.last = roll.current;
			roll.lastCount = roll.currentCount;
			roll.lastStart = roll.lastEnd;
			roll.lastEnd = now;
			roll.current = {};
			roll.currentCount = 0;
		}
	}
	
	const periodDuration = 60 * 60 * 1000;
	
	if(!config.demoMode)
		setInterval(function() {
			if(modified.stats)
				SaveToFile('stats');
			var now = Date.now();
			for(var iid in stats.roll)
				if(now - stats.roll[iid].lastHitTime > config.rollExpire)
					delete stats.roll[iid];
		},60*1000);
	
	var missedInventory = {};
	
	var modified = {stats:false,ads:false};
	
	var banner2campaign = {}
	var inventory2banner = {}
	
	function UpdateRevert() {
		inventory2banner = {}
		for(var bid in ads.banner)
			ads.banner[bid].inventory.forEach(function(iid) {
				inventory2banner[iid] = inventory2banner[iid] || {};
				inventory2banner[iid][bid] = 1;
			});
		banner2campaign = {}
		for(var cid in ads.campaign)
			ads.campaign[cid].banners.forEach(function(bid) {
				banner2campaign[bid] = banner2campaign[bid] || {};
				banner2campaign[bid][cid] = 1;
			});
	}
	
	function Updated(which) {
		if(which=='ads') {
			modified.ads = true;
			SaveToFile('ads');
			UpdateRevert();
		} else if(which=='stats')
			modified.stats = true;
	}
	
	function FixAds(ads) {
		ads = extend(true,{},ads);
		for(var bid in ads.banner) {
			var banner = ads.banner[bid];
			if(!banner.type)
				banner.type='image';
			if(banner.type=='image' && !banner.images)
				banner.images = {};
			if(banner.type=='text' && !banner.texts)
				banner.texts = {};
			if(typeof banner.adbUsed=="undefined") {
				banner.adbUsed = true;
				banner.adbUnsure = true;
				banner.adbUnused = true;
			}
			if(banner.type!='image' && banner.type!='text') {
				var addon0 = addons[banner.type]; 
				if(!addon0)
					banner.active = false;
				else {
					var addon = {};
					addon0.bannerSettings.forEach(function(field) {
						addon[field.name] = field.defaults;
					});
					banner.addon = extend(true,addon,banner.addon);
					for(var field in banner.addon)
						if(!addon[field])
							delete banner.addon[field];
				}
			}
		}
		for(var iid in ads.inventory) {
			var inventory = ads.inventory[iid];
			if(!inventory.classes)
				inventory.classes='';
			if(!inventory.styles)
				inventory.styles={};
		}
		var addons0 = {};
		(config.addons || []).forEach(function(addon0) {
			var addon = {
			}
			addon0.settings.forEach(function(field) {
				addon[field.name] = field.defaults;
			});
			addons0[addon0.name] = addon;
		});
		for(var aid in ads.addons) {
			if(!addons0[aid])
				delete ads.addons[aid];
		}
		ads.addons = extend(true,addons0,ads.addons);
		return ads;
	}

	function FixStats(stats) {
		return extend(true,{},statsEmpty,stats);
	}
	
	var loaded = {}
	function LoadFromFile(which) {
		fs.readFile(config.files[which],"utf-8",function(err,data) {
			if(err) {
				console.warn("Could not load",config.files[which],":",err);
				modified[which] = true;
			} else try {
				switch(which) {
				case "ads": 
					ads = FixAds(JSON.parse(data));
					UpdateRevert();
					break; 
				case "stats": 
					stats = FixStats(JSON.parse(data)); 
					break;
				}
				modified[which] = false;
			} catch(e) {
				console.error("Could not parse",config.files[which],":",e,e.stack);			
			}
			loaded[which] = true;
			if(callback && ((which=='stats' && loaded.ads) || (which=='ads' && loaded.stats)))
				callback();
		});
	}
	LoadFromFile("ads");
	LoadFromFile("stats");
	
	var saveInProgress = {
		ads: false,
		stats: false,
	}
	
	function SaveToFile(which,callback) {
		if(config.demoMode) {
			if(callback)
				callback();
			return;
		}
		if(saveInProgress[which]) {
			modified[which]=true;
		} else {
			modified[which]=false;
			var data=null;
			switch(which) {
			case "ads": data = JSON.stringify(ads,null,4); break; 
			case "stats": data = JSON.stringify(stats); break; 
			}
			if(data) {
				saveInProgress[which]=true;
				fs.writeFile(config.files[which],data,"utf-8",function(err) {
					saveInProgress[which]=false;				
					if(err)
						console.warn("Could not save",config.files[which],":",err);
					else if(modified[which]) {
						SaveToFile(which,callback);
						callback = null;
					}
					if(callback)
						callback();
				});
			}
		}
	}
	
	var inventoryIds = {}
	function InventoryId(iid) {
		var id = inventoryIds[iid];
		if(!id) {
			for(var id1 in ads.inventory)
				if(iid==ads.inventory[id1].hid) {
					id = id1;
					break;
				}
			if(id)
				inventoryIds[iid] = id;
		}
		return id;
	}
	
	function ContribAd(inventory) {
		var key = MakeShortId();
		var m = SIZE_RE.exec(inventory.size);
		if(!m)
			return null; // should not happen
		var width = m[1];
		var height = m[2];
		var ad = {
			inventory: inventory,
			link: "//eas.rocks/click/"+key,
			type: "image",
			banner: {
				alt: "",
			},
			content: {
				url: "//eas.rocks/creative/"+width+"/"+height+"/"+key,
			}
		};
		return ad;
	}
	
	exports.getMissedInventory = function() {
		return missedInventory;
	}
	
	exports.getAds = function() {
		return ads;
	}
	
	exports.getAddons = function() {
		return addons;
	}
	
	exports.getStats = function() {
		return stats;
	}
	
	exports.saveStats = function(callback) {
		SaveToFile('stats',callback);
	}
	
	exports.setInventory = function(inventory) {
		if(!inventory.id)
			inventory.id = MakeShortId();
		ads.inventory[inventory.id] = inventory;
		Updated('ads');
		return inventory;
	}
	
	exports.removeInventory = function(iid) {
		if(ads.inventory[iid]) {
			delete ads.inventory[iid];
			for(var bid in ads.banner) {
				var banner = ads.banner[bid];
				var i = banner.inventory.indexOf(iid);
				if(i>=0)
					banner.inventory.splice(i,1);
			}
			Updated('ads');
		}
	
	}
	
	exports.setCampaign = function(campaign) {
		var resetCurrent = false;
		if(!campaign.id)
			campaign.id = MakeShortId();
		else {
			var campaign0 = ads.campaign[campaign.id];
			if(!campaign0) {
				console.error("Campaign",campaign.id,"does not exist");
				return null;
			}
			if(campaign.type!=campaign0.type) {
				delete stats.period.impr[campaign.id];
				delete stats.period.click[campaign.id];
				delete stats.periodTime[campaign.id];
				delete stats.periodDraw[campaign.id];			
			}
		}
		Updated('stats');
		ads.campaign[campaign.id] = campaign;
		Updated('ads');
		EnsuresCampaignIntegrity(campaign);
		return campaign;
	}
	
	exports.removeCampaign = function(iid) {
		if(ads.campaign[iid]) {
			delete ads.campaign[iid];
			Updated('ads');
		}
	}
	
	exports.setBanner = function(banner,callback) {
		if(!banner.id)
			banner.id = MakeShortId();
		if(banner.type=='image') {
			var tasks = 1;
			function Done() {
				if(--tasks==0) {
					ads.banner[banner.id] = banner;
					Updated('ads');
					callback(banner);					
				}
			}
			banner.images = banner.images || {};
			for(var iid in banner.images) {
				if(banner.images[iid].url)
					continue;
				tasks++;
				(function(iid) {
					var imagePath = config.files.images+"/"+iid+".png" 
					fs.exists(imagePath,function(exists) {
						if(exists)
							return Done();
						var tmpPath = config.files.tmp+"/"+iid+".png"; 
						fs.exists(tmpPath,function(exists) {
							if(exists) {
								fs.rename(tmpPath,imagePath,function(err) {
									if(err)
										delete banner.images[iid];
									Done();
								});
							} else {
								delete banner.images[iid];
								return Done();
							}						
						});
					});
				})(iid);
			}
			Done();
		} else {
			ads.banner[banner.id] = banner;
			Updated('ads');
			callback(banner);
		}
	}
	
	exports.removeBanner = function(iid) {
		if(ads.banner[iid]) {
			delete ads.banner[iid];
			for(var cid in ads.campaign) {
				var campaign = ads.campaign[cid];
				var i = campaign.banners.indexOf(iid);
				if(i>=0)
					campaigb.banners.splice(i,1);
			}
			Updated('ads');
		}
	}
	
	exports.addBannerImage = function(bid,url,external,callback) {
		var banner = ads.banner[bid];
		if(!banner)
			return callback(new Error("Unknown banner id "+bid));
		var id = MakeShortId();
		var extension = "png";
		var m = /^[^\?]+\.([^\?\.]+)/.exec(url);
		if(m)
			extension = m[1];
		var raw = config.files.tmp+"/"+id+"-raw."+extension;
		try {
			var r = request.get({ 
				url: url,
				headers: {
					"User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:42.0) Gecko/20100101 Firefox/42.0",
					'accept': '*/*',
				}
			}).on('error', function(err) {
				callback(err);
			}).on('response', function(response) {
				if(response.statusCode!=200)
					return callback(new Error("Could not download: "+response.statusCode));
				r.pipe(fs.createWriteStream(raw)
					.on('error',function(err) {
						console.error("error stream",err);
						callback(err);
					})
					.on('finish',function() {
						gm(raw).size(function (err, size) {
							if(err)
								return callback(err);
							var sizeKey = size.width+"x"+size.height;
							if(!config.allowedSizes[sizeKey])
								return callback(new Error("Unsupported size "+sizeKey));
	
							if(external) {
								var images = banner.images;
								if(!images)
									images = banner.images = {};
								images[id] = {
									id: id,
									size: sizeKey,
									url: url,
								}
								Updated('ads');
								callback(null,{image:images[id]});							
							} else {
								var finalFile = config.files.tmp+"/"+id+".png";
								gm(raw)
								.noProfile()
								.write(finalFile, function (err) {
									if(err)
										return callback(new Error("Could not write file "+finalFile+": "+err));
									var image = {
										id: id,
										size: sizeKey,
									}
									var frameFile = config.files.tmp+"/"+id+"-0.png";
									fs.exists(frameFile,function(exists) {
										if(exists) 
											fs.rename(frameFile,finalFile,function(err) {
												if(err)
													return callback(new Error("Could not rename file "+frameFile+": "+err));
												return callback(null,image);												
											});
										else
											return callback(null,image);
									});
								});
							}
						});
					}));
			});
		} catch(e) {
			callback(e);
		}
	}
	
	exports.uploadBannerImages = function(bid,files,callback) {
		var banner = ads.banner[bid];
		if(!banner)
			return callback(new Error("Unknown banner id "+bid));
		var tasks = files.length+1;
		var images = [];
		var errors = [];
		function Done(err) {
			if(err)
				errors.push(err.message || err);
			if(--tasks==0) {
				callback(null,{
					images: images,
					errors: errors,				
				});
			}
		}
		for(var i=0;i<files.length;i++) {
			var file = files[i];
			(function(file) {
				var id = MakeShortId();
				gm(file.path).size(function (err, size) {
					if(err)
						return Done(new Error(file.originalFilename+": could not read image size - "+err));
					var sizeKey = size.width+"x"+size.height;
					if(!config.allowedSizes[sizeKey])
						return Done(new Error(file.originalFilename+": not an allowed size: "+sizeKey));
	
					var finalFile = config.files.tmp+"/"+id+".png";
					gm(file.path)
					.noProfile()
					.write(finalFile, function (err) {
						if(err)
							return Done(new Error(file.originalFilename+": could not write image file - "+err));
						var image = {
							id: id,
							size: sizeKey,
						}
						var frameFile = config.files.tmp+"/"+id+"-0.png";
						fs.exists(frameFile,function(exists) {
							if(exists) 
								fs.rename(frameFile,finalFile,function(err) {
									if(err)
										return Done(new Error(file.originalFilename+": could not rename image file - "+err));
									images.push(image);
									return Done(null);	
								});
							else {
								images.push(image);
								return Done(null);												
							}
						});
					});
				});
			})(files[i]);
		}
		Done();
	}
	
	exports.clearStats = function(type,id,which,callback) {
		if(typeof which=="string")
			which = [which];
		which.forEach(function(w) {
			if(w=='total') {
				if(stats.total[type] && stats.total[type].impr)
					delete stats.total[type].impr[id];
				if(stats.total[type] && stats.total[type].click)
					delete stats.total[type].click[id];
			} else {
				if(stats[w] && stats[w][type])
					stats[w][type][id] = {
						last: { impr: 0, click: 0 },
						lastStart: 0,
						lastEnd: 0,
						current: { impr: 0, click: 0 },					
					}
			}			
		});
		Updated('stats');
		callback(null,{});
	}
	
	exports.activeGroup = function(type,active,ids,callback) {
		if(ads[type]) {
			for(var id in ids) {
				var item = ads[type][id];
				if(item)
					item.active = active;
			}
			Updated('ads');
		}
		callback(null,{});
	}
	
	exports.setAddons = function(addons,callback) {
		ads.addons = addons;
		Updated('ads');
		callback(null,{});
	}
	
	exports.removeGroup = function(type,ids,callback) {
		if(ads[type]) {
			for(var id in ids) {
				var item = ads[type][id];
				if(item)
					delete ads[type][id];
			}
			Updated('ads');
		}
		callback(null,{});
	}
	
	ResolveAddon = function(addonName,inventory,banner,campaign) {
		var size = {
			type: inventory.size,
		}
		var sizeMatch = /^([0-9]+)x([0-9]+)$/.exec(inventory.size);
		if(sizeMatch) {
			size.width = parseInt(sizeMatch[1]);
			size.height = parseInt(sizeMatch[2]);
		}
		var html = addonTemplates[addonName]({
			settings: ads.addons[addonName],
			size: size,
			inventory: inventory,
			banner: banner,
			campaign: campaign,
		});
		return html;
	}
	
	exports.pick = function(invHid,options) {
		options = options || {};
		
		var inventory = ads.inventory[InventoryId(invHid)];
		if(!inventory) {
			missedInventory[invHid] = missedInventory[invHid] || 0;
			missedInventory[invHid]++;
			if(config.debugDeliver)
				console.info("EAS - no inventory defined for",invHid);
			return null;		
		}
		if(!inventory.active) {
			if(config.debugDeliver)
				console.info("EAS - inventory",invHid,"is not active");
			return null;
		}

		if(easContrib && Math.random()<.01 && SIZE_RE.test(inventory.size))
			return ContribAd(inventory);
		
		var now = Date.now();
	
		IncrStats('impr','inv',inventory.id);
	
		var ad = {
			inventory: inventory,
		};
		
		var sessHist = options.sessHist; 
		if(sessHist && !sessHist.b) {
			sessHist.b = {};
			sessHist.c = {};
			sessHist.i = {};
		}
		var pageHist = options.pageHist;
		if(!pageHist.b) {
			pageHist.b = {};
			pageHist.c = {};
			pageHist.i = {};		
		}
		var banners1 = {}
		var gotBanner = false;
		var campaigns0 = {}
		var banners0 = inventory2banner[inventory.id];
		for(var bid in banners0) {
			var banner = ads.banner[bid];
			if(banner.type=='text') {
				if(inventory.size!='text')
					continue;
				var txtCount = 0;
				for(var teid in banner.texts)
					txtCount++;
				if(txtCount==0)
					continue;
			} else if(banner.type=='image') {
				var imgCount = 0;
				for(var imid in banner.images)
					if(banner.images[imid].size==inventory.size)
						imgCount++
				if(imgCount==0)
					continue;
			} else {
				var addon = addons[banner.type];
				if(!addon)
					continue;
				if(addon.sizes.indexOf(inventory.size)<0)
					continue;
			}
			if((banner.type=='text' || banner.type=='image') && banner.link.trim().length==0)
				continue;
			if(!banner.active)
				continue;
			if(banner.browserType!="any") {
				var browserFamily = options.browser && options.browser.ua.family.toLowerCase();
				if(banner.browserType=="in") {
					if(!(browserFamily && banner.browsers.indexOf(browserFamily)>=0))
						continue;
				} else {
					if(!(browserFamily && banner.browsers.indexOf(browserFamily)<0))
						continue;				
				}
			}
			if(banner.osType!="any") {
				var osFamily = options.browser && options.browser.os.family.toLowerCase();
				if(banner.osType=="in") {
					if(!(osFamily && banner.oss.indexOf(osFamily)>=0))
						continue;
				} else {
					if(!(osFamily && banner.oss.indexOf(osFamily)<0))
						continue;				
				}
			}
			if(banner.countryType!="any") {
				if(banner.osType=="in") {
					if(!(options.country && banner.oss.indexOf(options.country)>=0))
						continue;
				} else {
					if(!(options.country && banner.oss.indexOf(options.country)<0))
						continue;				
				}
			}
			if(config.adblockerDetection) {
				if(options.adBlocker=="yes" && !banner.adbUsed)
					continue;
				if(options.adBlocker=="unsure" && !banner.adbUnsure)
					continue;
				if(options.adBlocker=="no" && !banner.adbUnused)
					continue;
			}
			if(banner.cap && sessHist && (sessHist.b[banner.id] || 0)>=banner.cap)
				continue;
			if(banner.pagecap && (pageHist.b[banner.id] || 0)>=banner.pagecap)
				continue;
			banners1[bid] = 1;
			gotBanner = true;
			for(var cid in banner2campaign[bid])
				campaigns0[cid] = 1;
		}
		if(!gotBanner) {
			AddRoll(inventory.id,"_noBanner");
			if(config.debugDeliver)
				console.info("EAS - no suitable banner for",invHid);
			return ad;
		}

		var totalWeight = 0;
		var weightedCampaigns = [];
		var priorityCampaigns = [];
		var pickedCampaign = null;
		for(var cid in campaigns0) {
			var campaign = ads.campaign[cid];
			if(!campaign.active)
				continue;
			if(campaign.cap && sessHist && (sessHist.c[campaign.id] || 0)>=campaign.cap)
				continue;
			if(campaign.pagecap && (pageHist.c[campaign.id] || 0)>=campaign.pagecap)
				continue;
			if(campaign.start && now<campaign.start)
				continue;
			if(campaign.end && now>campaign.end)
				continue;
			if(campaign.type=='background') {
				weightedCampaigns.push({
					campaign: campaign,
					weight: campaign.value,
				});
				totalWeight+=campaign.value;
			} else {
				EnsuresCampaignIntegrity(campaign);
				var periodType = periodTypes[campaign.type];
				if(!periodType) // should not happen
					continue;
				var duration = periodType.duration;
				if(!duration)
					duration = campaign.end - stats.periodTime[cid];
				
				stats.periodDraw[cid] ++;
				Updated('stats');
				var drawCount = stats.periodDraw[cid];
				var eventCount = stats.period[periodType.type][cid];
				
				if(eventCount==0) { // no event (click or impr) yet, handle as a background campaign
					weightedCampaigns.push({
						campaign: campaign,
						weight: 1,
					});
					totalWeight+=1;				
				} else {
					//console.info(
					//		"T remains",Math.floor((stats.periodTime[cid]+duration-now)/1000),"-",
					//		Math.floor((now - stats.periodTime[cid])/1000),"in the period",campaign.value,"to be reached",stats.period[periodType.type][cid],"done",
					//		"- proba",(now - stats.periodTime[cid])*(campaign.value-stats.period[periodType.type][cid])/(stats.periodDraw[cid]*(stats.periodTime[cid]+duration-now)));
					priorityCampaigns.push({
						campaign: campaign,
						probaTop: (now - stats.periodTime[cid])*(campaign.value-stats.period[periodType.type][cid]),
						probaBottom: stats.periodDraw[cid]*(stats.periodTime[cid]+duration-now),
					});
				}
			}
		}
		
		while(!pickedCampaign && priorityCampaigns.length>0) {
			var index = Math.floor(Math.random()*priorityCampaigns.length);
			var campCont = priorityCampaigns.splice(index,1)[0];
			if(Math.random()*campCont.probaBottom<campCont.probaTop)
				pickedCampaign = campCont.campaign;
		}

		if(!pickedCampaign) {
			var rnd=Math.floor(Math.random()*totalWeight);
			var weightCount = 0;
			weightedCampaigns.forEach(function(campCont) {
				if(pickedCampaign)
					return;
				if(weightCount+campCont.weight>rnd) {
					pickedCampaign = campCont.campaign;
					return;
				}
				weightCount+=campCont.weight;
			});
		}
	
		if(!pickedCampaign) {
			if(config.debugDeliver)
				console.info("EAS - no suitable campaign for",invHid)
			AddRoll(inventory.id,"_noCampaign");
			return ad;
		}

		var campaign = pickedCampaign;
		
		var banners2 = [];
		campaign.banners.forEach(function(bid) {
			if(bid in banners1)
				banners2.push(bid);					
		});
		var banner = ads.banner[banners2[Math.floor(Math.random()*banners2.length)]];
		var contentArr = [];
		if(banner.type=='text') {
			for(var teid in banner.texts)
				contentArr.push(teid);
		} else if(banner.type=='image') {
			for(var imid in banner.images) {
				var img = banner.images[imid];
				if(img.size==inventory.size)
					contentArr.push(imid);
			}
		} else {
			contentArr.push(ResolveAddon(banner.type,inventory,banner,campaign));
		}
		if(sessHist) {
			var contentArr1 = [];
			var min = Infinity;
			contentArr.forEach(function(coid) {
				var seenCount = sessHist.i[coid] || 0;
				if(seenCount<min) {
					min = seenCount;
					contentArr1 = [coid];
				} else if(seenCount==min)
					contentArr1.push(coid);
			});
			contentArr = contentArr1;
		}
		var content;
		if(banner.type=='text') 
			content = banner.texts[contentArr[Math.floor(Math.random()*contentArr.length)]];
		else if(banner.type=='image')
			content = banner.images[contentArr[Math.floor(Math.random()*contentArr.length)]];
		else
			content = contentArr[0];
		ad.type = banner.type;
		ad.campaign = campaign;
		ad.banner = banner;
		ad.content = content;
		if(sessHist) {
			sessHist.c[campaign.id] = (sessHist.c[campaign.id] || 0) + 1; 
			sessHist.b[banner.id] = (sessHist.b[banner.id] || 0) + 1;
			if(content.id)
				sessHist.i[content.id] = (sessHist.i[content.id] || 0) + 1; 
		}
		pageHist.c[campaign.id] = (pageHist.c[campaign.id] || 0) + 1; 
		pageHist.b[banner.id] = (pageHist.b[banner.id] || 0) + 1;
		if(content.id)
			pageHist.i[content.id] = (pageHist.i[content.id] || 0) + 1; 
		IncrStats('impr','cam',campaign.id);
		IncrStats('impr','ban',banner.id);
		if(content.id)
			IncrStats('impr','ima',content.id);
		AddRoll(inventory.id,campaign.id);
		return ad;
	}
	
	exports.click = function(invid,camid,banid,imaid) {
		IncrStats('click','inv',invid);
		IncrStats('click','cam',camid);
		IncrStats('click','ban',banid);
		IncrStats('click','ima',imaid);
		var banner = ads.banner[banid];
		if(banner)
			return banner.link.trim();
		return null;
	}
	
	exports.makeId = function() {
		return MakeShortId();
	}
		
	return exports;
}

