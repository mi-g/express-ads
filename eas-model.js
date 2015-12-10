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

const file = {
	ads: __dirname + "/ads.json",
	stats: __dirname + "/stats.json",
}

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


module.exports = function(config) {

	var adsEmpty = {
		inventory: {
		},
		campaign: {
		},
		banner: {
		},
	}
	var ads = extend(true,{},adsEmpty);
	var stats = {
		total: {
			inv: { impr: {}, click: {} },
			cam: { impr: {}, click: {} },
			ban: { impr: {}, click: {} },
			ima: { impr: {}, click: {} },
		},
		period: { impr: {}, click: {} },
		periodDraw: {},
		periodTime: {},
	}
	var exports = {};
	
	var gm;
	if(config.imageMagick)
		gm = require("gm").subClass({imageMagick: true});
	else
		gm = require("gm");
	
	function PurgeTmp() {
		fs.readdir(__dirname + "/ads/tmp/",function(err,files) {
			if(err)
				return console.warn("Could not read tmp directory:",err);
			var now = Date.now();
			files.forEach(function(file) {
				if(file=='.gitignore' || file=='keepalive')
					return;
				var path = __dirname + "/ads/tmp/"+file;
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
	
	function IncrStats(type,what,id) {
		stats.total[what][type][id] = (stats.total[what][type][id] || 0) + 1;
		if(what=='cam') {
			var campaign = ads.campaign[id];
			if(campaign) {
				//console.info("Campaign",campaign.hid,"got event",type,"at",new Date().toLocaleTimeString());
				EnsuresCampaignIntegrity(campaign);
				stats.period[type][campaign.id]++;
			}
		}
		Updated('stats');
	}
	
	const periodDuration = 60 * 60 * 1000;
	
	setInterval(function() {
		if(modified.stats)
			SaveToFile('stats');
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
		}
		return ads;
	}
	
	function LoadFromFile(which) {
		fs.readFile(file[which],"utf-8",function(err,data) {
			if(err)
				console.warn("Could not load",file[which],":",err);
			else try {
				switch(which) {
				case "ads": 
					ads = FixAds(JSON.parse(data));
					UpdateRevert();
					break; 
				case "stats": stats = JSON.parse(data); break;
				}
				modified[which] = false;
				return;
			} catch(e) {
				console.error("Could not parse",file[which],":",err);			
			}
		});
	}
	LoadFromFile("ads");
	LoadFromFile("stats");
	
	var saveInProgress = {
		ads: false,
		stats: false,
	}
	
	function SaveToFile(which) {
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
				fs.writeFile(file[which],data,"utf-8",function(err) {
					saveInProgress[which]=false;				
					if(err)
						console.warn("Could not save",file[which],":",err);
					else if(modified[which])
						SaveToFile(which);
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
	
	exports.getMissedInventory = function() {
		return missedInventory;
	}
	
	exports.getAds = function() {
		return ads;
	}
	
	exports.getStats = function() {
		return stats;
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
	
	exports.setBanner = function(banner) {
		if(!banner.id)
			banner.id = MakeShortId();
		ads.banner[banner.id] = banner;
		Updated('ads');
		return banner;
	}
	
	exports.removeBanner = function(iid) {
		if(ads.banner[iid]) {
			delete ads.banner[iid];
			Updated('ads');
		}
	}
	
	const allowedSizes = {"300x250":1,"250x250":1,"468x60":1,"728x90":1,"120x600":1,"160x600":1,"160x300":1}
	
	exports.addBannerImage = function(bid,url,external,callback) {
		var banner = ads.banner[bid];
		if(!banner)
			return callback(new Error("Unknown banner id "+bid));
		var id = MakeShortId();
		var extension = "png";
		var m = /^[^\?]+\.([^\?\.]+)/.exec(url);
		if(m)
			extension = m[1];
		var raw = __dirname + "/ads/tmp/"+id+"."+extension;
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
							if(!allowedSizes[sizeKey])
								return callback(new Error("Invalid size "+sizeKey+". Allowed: "+Object.keys(allowedSizes).join(", ")));
	
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
								var finalFile = __dirname + "/ads/images/"+id+".png";
								gm(raw)
								.noProfile()
								.write(finalFile, function (err) {
									if(err)
										return callback(new Error("Could not write file "+finalFile+": "+err));
									var images = banner.images;
									if(!images)
										images = banner.images = {};
									images[id] = {
										id: id,
										size: sizeKey,
									}
									Updated('ads');
									callback(null,{image:images[id]});
								});
							}
						});
					}));
			});
		} catch(e) {
			callback(e);
		}
	}
	
	exports.removeBannerImage = function(bid,iid,callback) {
		var banner = ads.banner[bid];
		if(!banner)
			return callback(new Error("Unknown banner id "+bid));
		if(!banner.images[iid])
			return callback(new Error("Unknown banner image id "+iid));
		delete banner.images[iid];
		callback(null,{});
	}
	
	exports.clearStats = function(type,id,callback) {
		if(stats.total[type] && stats.total[type].impr)
			delete stats.total[type].impr[id];
		if(stats.total[type] && stats.total[type].click)
			delete stats.total[type].click[id];
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
			var imgCount = 0;
			for(var imid in banner.images)
				if(banner.images[imid].size==inventory.size)
					imgCount++
			if(imgCount==0)
				continue;
			if(banner.link.trim().length==0)
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
			if(banner.cap && sessHist && (sessHist.b[banner.id] || 0)>=banner.cap)
				continue;
			if(banner.pagecap && (pageHist.b[banner.id] || 0)>=banner.pagecap)
				continue;
			banners1[bid] = 1;
			gotBanner = true;
			for(var cid in banner2campaign[bid])
				campaigns0[cid] = 1;
		}
		if(!gotBanner && config.debugDeliver)
			console.info("EAS - no suitable banner for",invHid);
		var campaigns1 = {}
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
			campaigns1[cid] = 1;
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
				console.info("EAS - no suitable campaign for inventory",invHid)
			return ad;
		}
	
		var campaign = pickedCampaign;
		
		var banners2 = [];
		campaign.banners.forEach(function(bid) {
			if(bid in banners1)
				banners2.push(bid);					
		});
		var banner = ads.banner[banners2[Math.floor(Math.random()*banners2.length)]];
		var imageArr = [];
		for(var imid in banner.images) {
			var img = banner.images[imid];
			if(img.size==inventory.size)
				imageArr.push(imid);
		}
		if(sessHist) {
			var imageArr1 = [];
			var min = Infinity;
			imageArr.forEach(function(imid) {
				var seenCount = sessHist.i[imid] || 0;
				if(seenCount<min) {
					min = seenCount;
					imageArr1 = [imid];
				} else if(seenCount==min)
					imageArr1.push(imid);
			});
			imageArr = imageArr1;
		}
		var image = banner.images[imageArr[Math.floor(Math.random()*imageArr.length)]];
		ad.campaign = campaign;
		ad.banner = banner;
		ad.image = image;
		if(sessHist) {
			sessHist.c[campaign.id] = (sessHist.c[campaign.id] || 0) + 1; 
			sessHist.b[banner.id] = (sessHist.b[banner.id] || 0) + 1; 
			sessHist.i[image.id] = (sessHist.i[image.id] || 0) + 1; 
		}
		pageHist.c[campaign.id] = (pageHist.c[campaign.id] || 0) + 1; 
		pageHist.b[banner.id] = (pageHist.b[banner.id] || 0) + 1; 
		pageHist.i[image.id] = (pageHist.i[image.id] || 0) + 1; 
		IncrStats('impr','cam',campaign.id);
		IncrStats('impr','ban',banner.id);
		IncrStats('impr','ima',image.id);
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
	
	return exports;
}

