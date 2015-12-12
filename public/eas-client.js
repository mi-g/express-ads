/* 
 * Copyright (c) 2015 Michel Gutierrez
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

angular.module('EASApp', ["ui.select"]);

angular.module('EASApp').controller('EASCtrl', 
	['$scope', '$http',
	 function ($scope,$http) {

		console.info("EASCtrl");
		
		$scope.data = {};
		$scope.context = {
			inventory: null,
			campaign: null,
			banner: null,
			addImageError: null,
			addImageUrl: "",
			startType: "now",
			endType: "never",
			start: Date.now(),
			end: new Date(Date.now()+7*24*60*60*1000).getTime(),
			selected: {},
			selToggle: true,
			invStyleProp: null,
			invStyleValue: null,
		}
		$scope.campaignUsage = {};
		$scope.bannerUsage = {};
		$scope.inventoryUsage = {};
		$scope.local = {
			filterInventoryActive: true,
			filterInventoryCampaign: null,
			filterInventoryBanner: null,
			filterCampaignActive: true,
			filterCampaignInventory: null,
			filterCampaignBanner: null,
			filterBannerActive: true,
			filterBannerInventory: null,
			filterBannerCampaign: null,
			tab: "campaign",
		}
		if(window.localStorage) {
			var local = window.localStorage.getItem("eas");
			if(local) 
				try {
					var stored = JSON.parse(local);
					angular.merge($scope.local,stored);
				} catch(e) {}
		}
		$scope.sizes = [
		    {value: "300x250", label: "300x250" },
		    {value: "250x250", label: "250x250" },
		    {value: "468x60", label: "468x60" },
		    {value: "728x90", label: "728x90" },
		    {value: "120x600", label: "120x600" },
		    {value: "160x600", label: "160x600" },
		    {value: "160x300", label: "160x300" },
		];
		$scope.campTypes = [
		    {value: "background", label: "Background", vLabel: "Weight" },
		    {value: "click", label: "Clicks", vLabel: "Total clicks" },
		    {value: "impr", label: "Imprs", vLabel: "Total imprs" },
		    {value: "clickperminute", label: "Clicks per minute", vLabel: "Clicks per minute" },
		    {value: "clickperhour", label: "Clicks per hour", vLabel: "Clicks per hour" },
		    {value: "clickperday", label: "Clicks per day", vLabel: "Clicks per day" },
		    {value: "clickperweek", label: "Clicks per week", vLabel: "Clicks per week" },
		    {value: "clickpermonth", label: "Clicks per month", vLabel: "Clicks per month" },
		    {value: "imprperminute", label: "Imprs per minute", vLabel: "Imprs per minute" },
		    {value: "imprperhour", label: "Imprs per hour", vLabel: "Imprs per hour" },
		    {value: "imprperday", label: "Imprs per day", vLabel: "Imprs per day" },
		    {value: "imprperweek", label: "Imprs per week", vLabel: "Imprs per week" },
		    {value: "imprpermonth", label: "Imprs per month", vLabel: "Imprs per month" },
		];
		$scope.bannerTypes = [{value:'image',label:'Images'}];
		$scope.nobanners = [{value:'hide',label:"Hide area"},{value:'blank',label:"Blank area"}];
		$scope.startTypes = [
		    {value: "now", label: "Starts now" },
		    {value: "date", label: "Starts at" },
		];
		$scope.endTypes = [
		    {value: "never", label: "Never ends" },
		    {value: "date", label: "Ends at" },
		];
		$scope.countryTypes = [
  		    {value: "any", label: "Any country" },
  		    {value: "in", label: "Selected countries" },
  		    {value: "out", label: "All but countries..." },
  		];
		$scope.browserTypes = [
  		    {value: "any", label: "Any browser" },
  		    {value: "in", label: "Selected browsers" },
  		    {value: "out", label: "All but browsers..." },
  		];
		$scope.osTypes = [
  		    {value: "any", label: "Any OS" },
  		    {value: "in", label: "Selected OSes" },
  		    {value: "out", label: "All but OSes..." },
  		];
		$scope.browserFamilies = {
			"bingbot": "bingbot",
	        "firefox": "Firefox",
	        "android": "Android",
	        "chrome": "Chrome",
	        "pale moon": "Pale Moon",
	        "slurp": "Slurp",
	        "yandexbot": "YandexBot",
	        "mobile safari": "Mobile Safari",
	        "ie": "IE",
	        "phantomjs": "PhantomJS",
	        "yandex browser": "Yandex Browser",
	        "maxthon": "Maxthon",
	        "other": "Other",
	        "safari": "Safari",
	        "applemail": "AppleMail",
	        "chrome mobile": "Chrome Mobile",
	        "ie mobile": "IE Mobile",
	        "opera": "Opera",
	        "firefox mobile": "Firefox Mobile",
	        "iceweasel": "Iceweasel",
	        "chromium": "Chromium",
	        "googlebot": "Googlebot",
	        "firefox beta": "Firefox Beta",
	        "uc browser": "UC Browser",
	        "qq browser mobile": "QQ Browser Mobile",
	        "firefox alpha": "Firefox Alpha",
	        "opera mini": "Opera Mini",
	        "twitterbot": "TwitterBot",
	        "opera mobile": "Opera Mobile",
	        "iron": "Iron",
	        "seamonkey": "SeaMonkey",
	        "k-meleon": "K-Meleon",
	        "up.browser": "UP.Browser",
	        "avant": "Avant",
	        "dolfin": "Dolfin",
	        "chrome mobile ios": "Chrome Mobile iOS",
	        "konqueror": "Konqueror",
	        "camino": "Camino",
	        "facebookbot": "FacebookBot"		
		}
		$scope.osFamilies = {
	       "other": "Other",
	        "windows 7": "Windows 7",
	        "windows": "Windows",
	        "windows 8.1": "Windows 8.1",
	        "windows xp": "Windows XP",
	        "android": "Android",
	        "windows 8": "Windows 8",
	        "ubuntu": "Ubuntu",
	        "mac os x": "Mac OS X",
	        "linux": "Linux",
	        "windows vista": "Windows Vista",
	        "ios": "iOS",
	        "linux mint": "Linux Mint",
	        "windows phone": "Windows Phone",
	        "fedora": "Fedora",
	        "windows ce": "Windows CE",
	        "windows rt 8.1": "Windows RT 8.1",
	        "chrome os": "Chrome OS",
	        "windows rt": "Windows RT",
	        "windows 98": "Windows 98",
	        "windows 95": "Windows 95",
	        "windows 2000": "Windows 2000",
	        "netbsd": "NetBSD",
	        "debian": "Debian"
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
		
		
		function Call(apiUrl,apiParams,callback) {
			$scope.loading = true;

			console.info("Call",apiUrl,apiParams)
			$http.post(easAPI + apiUrl,apiParams).then(function(data) {
				$scope.loading = false;
				if(!data.data.status)
					return callback(new Error(data.data.error));
				else
					return callback(null,data.data.result || null);
			},function(err) {
				$scope.loading = false;
				console.info("Error",err);
				if(err.status==403)
					alert("Logged out ?");
				else if(err.status==-1)
					alert("Server down ?");
				callback(err);
			});									
		}
		
		$scope.campTypeValueLabel = function(type) {
			for(var i=0;i<$scope.campTypes.length;i++)
				if($scope.campTypes[i].value==type)
					return $scope.campTypes[i].vLabel;
			return "";
		}
		
		$scope.bannerTypeValueLabel = function(type) {
			for(var i=0;i<$scope.bannerTypes.length;i++)
				if($scope.bannerTypes[i].value==type)
					return $scope.bannerTypes[i].label;
			return "";
		}
		
		$scope.campTypeLabel = function(type) {
			for(var i=0;i<$scope.campTypes.length;i++)
				if($scope.campTypes[i].value==type)
					return $scope.campTypes[i].label;
			return "";
		}
		
		$scope.campRemains = function(cid) {
			var campaign = $scope.data.ads.campaign[cid];
			if(!campaign)
				return "-";
			var periodType = periodTypes[campaign.type];
			if(periodType) {
				var eventsCount = $scope.data.stats.period[periodType.type][cid] || 0;
				if(periodType.duration) {
					var timeRemaining = Math.max(0,($scope.data.stats.periodTime[cid]+periodType.duration)-$scope.data.now);
					return Math.max(0,campaign.value-eventsCount) + " " + periodType.type+"s in "+TimeToText(timeRemaining);
				} else {
					var timeRemaining = Math.max(0,campaign.end-$scope.data.now);
					return Math.max(0,campaign.value-eventsCount) + " " + periodType.type+"s in "+TimeToText(timeRemaining);
				}
			}
		}
		
		$scope.$watch('context.addImageUrl',function() {
			$scope.context.addImageError = null;
		});
		
		$scope.$watch('local.tab',function() {
			$scope.context.selected = {};
			$scope.context.selToggle = true;
			$(".tooltip").remove();
		});
		$scope.$watch('local',function() {
			if(window.localStorage)
				window.localStorage.setItem("eas",JSON.stringify($scope.local));
		},true);
		
		function UpdateSchedule() {
			var campaign = $scope.context.campaign;
			var context = $scope.context;
			if(campaign) {
				if(context.startType=='date')
					campaign.start = new Date(context.start).getTime();
				else if(context.startType=='now')
					campaign.start = 0;
				if(context.endType=='date')
					campaign.end = new Date(context.end).getTime();
				else if(context.endType=='never')
					campaign.end = 0;
			}
		}
		$scope.$watch('context.startType+context.start+context.endType+context.end',UpdateSchedule);
		
		$scope.selectionToggle = function() {
			if(['campaign','banner','inventory'].indexOf($scope.local.tab)>=0) {
				for(var id in $scope.data.ads[$scope.local.tab])
					$scope.context.selected[id] = $scope.context.selToggle;
				$scope.context.selToggle = !$scope.context.selToggle;
			}
		}
		$scope.selectedCount = function() {
			var count = 0;
			for(var id in $scope.context.selected)
				if($scope.context.selected[id])
					count++;
			return count;
		}
		
		$scope.activeSelected = function(active) {
			if(['campaign','banner','inventory'].indexOf($scope.local.tab)>=0) {
				Call('/active-group',{type: $scope.local.tab, active: active, ids: $scope.context.selected},function(err,data) {
					$scope.getAds();
				});				
			}
		}
		
		$scope.removeSelected = function() {
			if(['campaign','banner','inventory'].indexOf($scope.local.tab)>=0) {
				var count = 0;
				for(var id in $scope.context.selected)
					if($scope.context.selected[id])
						count++;
				if(confirm("Do you really want to remove "+count+" item"+(count>1?"s":"")+" ?")) {
					Call('/remove-group',{type: $scope.local.tab, ids: $scope.context.selected},function(err,data) {
						$scope.getAds();
					});
				}
			}
		}
		
		$scope.mustHaveEnd = function() {
			return $scope.context.campaign && (
				$scope.context.campaign.type=='click' || $scope.context.campaign.type=='impr' 
			);
		}
		$scope.$watch('context.campaign.type',function() {
			if($scope.mustHaveEnd()) {
				$scope.context.endType = 'date';
				$scope.context.end = $scope.context.campaign.end || new Date(Date.now()+7*24*60*60*1000);
			}
		});

		$scope.getAds = function(callback) {
			Call('/',{},function(err,data) {
				$(".tooltip").hide();
		    	$("[vdh-tooltip]").tooltip('hide');
				if(!err) {
					$scope.data = data;
					angular.extend($scope.osFamilies,data.osFamilies);
					angular.extend($scope.browserFamilies,data.browserFamilies);
					$scope.context.selected = {}
					$scope.selToggle = true;
					$scope.calcInventoryUsage();
					$scope.calcCampaignUsage();
					$scope.calcBannerUsage();
					if(callback)
						callback();
				}
			});
		}
		$scope.getAds();
		
		$scope.floor = function(val) {
			return Math.floor(val);
		}
		
		$scope.prettyAds = function() {
			return JSON.stringify($scope.data,null,4);
		}
		
		/* inventory */
		$scope.newInventory = function() {
			$scope.context.inventory = {
				hid: "",
				active: true,
				size: "300x250",
				description: "",
				nobanner: "hide",
				classes: "",
				styles: {},
			}
		}

		$scope.cancelInventory = function() {
			$scope.context.inventory = null;
		}

		$scope.saveInventory = function() {
			Call('/set-inventory',{inventory: $scope.context.inventory},function(err,data) {
				$scope.getAds();
			});
			$scope.context.inventory = null;
		}

		$scope.removeInventory = function(inv) {
			if(confirm("Are you sure you want to remove the inventory ?")) {
				$scope.context.inventory = null;
				Call('/remove-inventory',{iid: inv.id},function(err,data) {
					$scope.getAds();
				});
			}
		}
		
		$scope.changedInventory = function() {
			if(!$scope.context.inventory)
				return false;
			return !angular.equals($scope.context.inventory,$scope.data.ads.inventory[$scope.context.inventory.id]);			
		}
		
		$scope.selectInventory = function(inv) {
			$scope.context.inventory = angular.copy(inv);
		}
		
		$scope.inventoryCount = function() {
			if(!$scope.data.ads)
				return 0;
			var count = 0;
			for(var i in $scope.data.ads.inventory)
				count++;
			return count;
		}
		
		$scope.inventoryHasStyle = function() {
			if(!$scope.context.inventory)
				return false;
			for(var i in $scope.context.inventory.styles)
				return true;
			return false;
		}
		
		$scope.addInventoryStyle = function() {
			$scope.context.inventory.styles[$scope.context.invStyleProp.trim()] = $scope.context.invStyleValue.trim();
			$scope.context.invStyleProp = null;
			$scope.context.invStyleValue = null;
		}
		
		$scope.newInventoryStyle = function() {
			$scope.context.invStyleProp = "";
			$scope.context.invStyleValue = "";
		}
		
		$scope.removeInventoryStyle = function(prop) {
			delete $scope.context.inventory.styles[prop];
		}

		/* campaign */
		$scope.newCampaign = function() {
			$scope.context.campaign = {
				hid: "",
				active: true,
				type: "background",
				value: 1,
				cap: 0,
				pagecap: 0,
				paused: false,
				banners: [],
				description: "",
				start: 0,
				end: 0,
			}
		}

		$scope.cancelCampaign = function() {
			$scope.context.campaign = null;
		}

		$scope.saveCampaign = function() {
			console.info("/set-campaign",$scope.context.campaign)
			Call('/set-campaign',{campaign: $scope.context.campaign},function(err,data) {
				$scope.getAds();
			});
			$scope.context.campaign = null;
		}

		$scope.removeCampaign = function(inv) {
			if(confirm("Are you sure you want to remove the campaign ?")) {
				$scope.context.campaign = null;
				Call('/remove-campaign',{iid: inv.id},function(err,data) {
					$scope.getAds();
				});
			}
		}
		
		$scope.changedCampaign = function() {
			if(!$scope.context.campaign)
				return false;
			return !angular.equals($scope.context.campaign,$scope.data.ads.campaign[$scope.context.campaign.id]);			
		}
		
		$scope.selectCampaign = function(inv) {
			$scope.context.campaign = angular.copy(inv);
			$scope.context.startType = $scope.context.campaign.start ? "date" : "now";  
			$scope.context.endType = $scope.context.campaign.end ? "date" : "never";  
		}
		
		$scope.campaignCount = function() {
			if(!$scope.data.ads)
				return 0;
			var count = 0;
			for(var i in $scope.data.ads.campaign)
				count++;
			return count;
		}

		$scope.campaignStatus = function(campaign) {
			if(campaign.start && campaign.start>$scope.data.now) {
				return {
					title: "Waiting "+TimeToText(campaign.start-$scope.data.now),
					clazz: "fa-clock-o",
				}
			}
			if(campaign.end && campaign.end<$scope.data.now) 
				return {
					title: "Complete",
					clazz: "fa-times",
				}
			if(campaign.active) 
				return {
					title: "Running",
					clazz: "fa-play",
				}
			else
				return {
					title: "Paused",
					clazz: "fa-pause",
				}
		}
		
		/* banner */
		$scope.newBanner = function() {
			$scope.context.banner = {
				hid: "",
				active: true,
				type: "image",
				link: "",
				alt: "",
				cap: 0,
				pagecap: 0,
				description: "",
				images: {},
				inventory: [],
				countryType: "any",
				countries: [],
				browserType: "any",
				browsers: [],
				osType: "any",
				oss: [],
			}
		}

		$scope.cancelBanner = function() {
			$scope.context.banner = null;
		}

		$scope.saveBanner = function() {
			Call('/set-banner',{banner: $scope.context.banner},function(err,data) {
				$scope.getAds();
			});
			$scope.context.banner = null;
		}

		$scope.removeBanner = function(inv) {
			if(confirm("Are you sure you want to remove the banner ?")) {
				$scope.context.banner = null;
				Call('/remove-banner',{iid: inv.id},function(err,data) {
					$scope.getAds();
				});
			}
		}
		
		$scope.changedBanner = function() {
			if(!$scope.context.banner)
				return false;
			return !angular.equals($scope.context.banner,$scope.data.ads.banner[$scope.context.banner.id]);			
		}
		
		$scope.selectBanner = function(ban) {
			$scope.context.banner = angular.copy(ban);
		}
		
		$scope.bannerCount = function() {
			if(!$scope.data.ads)
				return 0;
			var count = 0;
			for(var i in $scope.data.ads.banner)
				count++;
			return count;
		}
		
		$scope.addBannerImage = function() {
			var imageUrl = ($scope.context.addImageUrl || "").trim();
			if(!imageUrl)
				return;
			var bid = $scope.context.banner.id;
			Call('/add-banner-image',{bid: bid,url:imageUrl},function(err,data) {
				if(err)
					$scope.context.addImageError = err.data.error;
				else
					$scope.getAds(function() {
						$scope.selectBanner($scope.data.ads.banner[bid]);
					});
			});
		}
		
		$scope.addBannerImageUrl = function() {
			var imageUrl = ($scope.context.addImageUrl || "").trim();
			if(!imageUrl)
				return;
			var bid = $scope.context.banner.id;
			Call('/add-banner-image-url',{bid: bid,url:imageUrl},function(err,data) {
				if(err)
					$scope.context.addImageError = err.data.error;
				else
					$scope.getAds(function() {
						$scope.selectBanner($scope.data.ads.banner[bid]);
					});
			});
		}
		
		$scope.removeBannerImage = function(img) {
			if(confirm("Are you sure you want to remove the banner image ?")) {
				var bid = $scope.context.banner.id;
				Call('/remove-banner-image',{bid: bid,iid:img.id},function(err,data) {
					if(!err) {
						$scope.getAds(function() {
							$scope.selectBanner($scope.data.ads.banner[bid]);
						});
					}
				});
			}
		}
		
		$scope.bannerImagesCount = function() {
			if(!$scope.context.banner)
				return 0;
			if(!$scope.context.banner.images)
				return 0;
			var count=0;
			for(var img in $scope.context.banner.images)
				count++;
			return count;
		}
		
		$scope.bannersArray = function() {
			if(!$scope.data || !$scope.data.ads || !$scope.data.ads.banner)
				return [];
			var arr=[];
			for(var id in $scope.data.ads.banner)
				arr.push($scope.data.ads.banner[id]);
			return arr;
		}
				
		$scope.inventoryArray = function() {
			if(!$scope.data || !$scope.data.ads || !$scope.data.ads.inventory)
				return [];
			var arr=[];
			for(var id in $scope.data.ads.inventory)
				arr.push($scope.data.ads.inventory[id]);
			return arr;
		}
				
		$scope.calcCTR = function(object,id) {
			if(!object || !object.click || !object.impr)
				return "-";
			if(!object.click[id])
				return 0;
			if(object.impr[id])
				return Math.round(object.click[id]*10000/object.impr[id])/100;
			else
				return "-";
		}
		
		function TimeToText(value) {
			value=Math.floor(value/1000);
			var days=Math.floor(value/86400);
			value%=86400;
			var hours=Math.floor(value/3600);
			value%=3600;
			var minutes=Math.floor(value/60);
			var seconds=value%60;
			var str="";
			if(days>3)
				str+=days+'d';
			else if(days>0) {
				if(hours>0)
					str+=days+"d"+hours+"h"
				else
					str+=days+"d";
			} else if(hours>3)
				str+=hours+"h";
			else if(hours>0) {
				if(minutes>0)
					str+=hours+"h"+minutes+"m";
				else
					str+=hours+"h";
			} else {
				str+=minutes+':';
				if(seconds<10)
					str+='0';
				str+=seconds;
			}
			return str;
		}
		
		$scope.imageUrl = function(img) {
			return img.url || '/eas/images/'+img.id+'.png';
		}
		
		$scope.capitalize = function(string) {
		    return string.charAt(0).toUpperCase() + string.slice(1);
		}

		$scope.clearStats = function(type,id) {
			Call('/clear-stats',{type: type, id: id},function(err,data) {
				$scope.getAds();
			});
		}
		
		$scope.bannerImageTooltip = function(img) {
			return '<div><img style=\'max-width:400px;max-height:200px\' src=\''+$scope.imageUrl(img)+'\'/></div>';			
		}
		
		$scope.filterCampaign = function(cam) {
			if($scope.local.filterCampaignActive && !cam.active)
				return false;
			if($scope.data.ads && $scope.data.ads.inventory[$scope.local.filterCampaignInventory] && 
					!$scope.campaignUsage[cam.id].inventory[$scope.local.filterCampaignInventory])
				return false;
			if($scope.data.ads && $scope.data.ads.banner[$scope.local.filterCampaignBanner] && 
					!$scope.campaignUsage[cam.id].banners[$scope.local.filterCampaignBanner])
				return false;
			return true;
		}
		
		$scope.calcCampaignUsage = function() {
			if(!$scope.data || !$scope.data.ads || !$scope.data.ads.campaign)
				return;
			$scope.campaignUsage = {};
			for(var camId in $scope.data.ads.campaign) {
				var cam = $scope.data.ads.campaign[camId];
								
				var banners = {};
				var inventory = {};
				if(cam.active) {					
					cam.banners.forEach(function(bid) {
						if(!$scope.data.ads.banner[bid])
							return;
						if(!$scope.data.ads.banner[bid].active)
							return;
						banners[bid] = 1;
					});
					for(var bid in banners) {
						var banner = $scope.data.ads.banner[bid];
						banner.inventory.forEach(function(iid) {
							var inv = $scope.data.ads.inventory[iid];
							if(!inv)
								return;
							if(!inv.active)
								return;
							for(var imid in banner.images) {
								var image = banner.images[imid];
								if(!image)
									continue;
								if(image.size==inv.size)
									inventory[iid] = 1;
							}
						});
					}
				}
				$scope.campaignUsage[camId] = {
					banners: banners,
					inventory: inventory,
				}
			}
			
			var campaignInv = {};
			var campaignCount = {};
			for(var invId in $scope.data.stats.roll) {
				if(!$scope.data.ads.inventory[invId])
					continue;
				var roll = $scope.data.stats.roll[invId];
				for(var cid in roll.current) {
					if(!(cid in $scope.campaignUsage))
						continue;
					campaignInv[cid] = campaignInv[cid] || {};
					campaignInv[cid][invId] = (campaignInv[cid][invId] || 0) + roll.current[cid];
					campaignCount[cid] = (campaignCount[cid] || 0) + roll.current[cid];
				}
				for(var cid in roll.last) {
					if(!(cid in $scope.campaignUsage))
						continue;
					campaignInv[cid] = campaignInv[cid] || {};
					campaignInv[cid][invId] = (campaignInv[cid][invId] || 0) + roll.last[cid];
					campaignCount[cid] = (campaignCount[cid] || 0) + roll.last[cid];
				}
			}
			for(var cid in campaignInv) {
				$scope.campaignUsage[cid].inventoryUsagePercent = {};
				for(var iid in campaignInv[cid])
					$scope.campaignUsage[cid].inventoryUsagePercent[iid] = Math.round(campaignInv[cid][iid]*100/campaignCount[cid]);
			}
		}

		$scope.filterBanner = function(ban) {
			if($scope.local.filterBannerActive && !ban.active)
				return false;
			if($scope.data.ads && $scope.data.ads.inventory[$scope.local.filterBannerInventory] && 
					!$scope.bannerUsage[ban.id].inventory[$scope.local.filterBannerInventory])
				return false;
			if($scope.data.ads && $scope.data.ads.campaign[$scope.local.filterBannerCampaign] && 
					!$scope.bannerUsage[ban.id].campaigns[$scope.local.filterBannerCampaign])
				return false;
			return true;
		}
		
		$scope.calcBannerUsage = function() {
			if(!$scope.data || !$scope.data.ads || !$scope.data.ads.banner)
				return;
			$scope.bannerUsage = {};
			for(var banId in $scope.data.ads.banner) {
				var banner = $scope.data.ads.banner[banId];
				var campaigns = {};
				var inventory = {};
				if(banner.active) {					
					banner.inventory.forEach(function(iid) {
						var inv = $scope.data.ads.inventory[iid];
						if(!inv)
							return;
						if(!inv.active)
							return;
						for(var imid in banner.images) {
							var image = banner.images[imid];
							if(!image)
								continue;
							if(image.size==inv.size)
								inventory[iid] = 1;
						}
					});
					for(var cid in $scope.data.ads.campaign) {
						var campaign = $scope.data.ads.campaign[cid];
						if(!campaign)
							continue;
						if(!campaign.active)
							continue;
						if(campaign.banners.indexOf(banner.id)>=0)
							campaigns[cid] = 1;
					}
				}
				$scope.bannerUsage[banId] = {
					campaigns: campaigns,
					inventory: inventory,
				}
			}
		}
		
		$scope.filterActiveInventory = function(inv) {
			return inv.active;
		}

		$scope.filterInventory = function(inv) {
			if($scope.local.filterInventoryActive && !inv.active)
				return false;
			if($scope.data.ads && $scope.data.ads.campaign[$scope.local.filterInventoryCampaign] && 
					!$scope.inventoryUsage[inv.id].campaigns[$scope.local.filterInventoryCampaign])
				return false;
			if($scope.data.ads && $scope.data.ads.banner[$scope.local.filterInventoryBanner] && 
					!$scope.inventoryUsage[inv.id].banners[$scope.local.filterInventoryBanner])
				return false;
			return true;
		}
		
		$scope.calcInventoryUsage = function() {
			if(!$scope.data || !$scope.data.ads || !$scope.data.ads.inventory)
				return;
			var now = $scope.data.now;
			$scope.inventoryUsage = {};
			for(var invId in $scope.data.ads.inventory) {
				var inv = $scope.data.ads.inventory[invId];
				
				var uroll = {
					total: 0,
					campaignPercent: {},
				};
				var roll = $scope.data.stats.roll[invId];
				if(roll) {
					var total = roll.currentCount + roll.lastCount;
					if(total>0) {
						uroll.total = total;
						uroll.perday = Math.round(total * ( 24*60*60*1000 / (now-roll.lastStart)));
						var campaigns0 = {}
						for(var cid in roll.current) {
							if(cid[0]=='_')
								continue;
							campaigns0[cid] = roll.current[cid];
						}
						for(var cid in roll.last) {
							if(cid[0]=='_')
								continue;
							campaigns0[cid] = (campaigns0[cid] || 0) + roll.last[cid];
						}
						var background = 0;
						var scheduled = 0;
						for(var cid in campaigns0) {
							var campaign = $scope.data.ads.campaign[cid];
							uroll.campaignPercent[cid] = Math.round(campaigns0[cid]*100/total);
							if(campaign) {
								if(campaign.type=='background')
									background += campaigns0[cid];
								else
									scheduled += campaigns0[cid];
							}
						}
						uroll.backgroundPercent = Math.round(background*100/total);
						uroll.scheduledPercent = Math.round(scheduled*100/total)
						var missedBanner = (roll.current['_noBanner'] || 0) + (roll.last['_noBanner'] || 0);
						uroll.missedBannerPercent = Math.round(missedBanner*100/total)
						var missedCampaign = (roll.current['_noCampaign'] || 0) + (roll.last['_noCampaign'] || 0);
						uroll.missedCampaignPercent = Math.round(missedCampaign*100/total)
					}
				}
				
				var banners = {};
				var campaigns = {};
				if(inv.active) {
					for(var bid in $scope.data.ads.banner) {
						var banner = $scope.data.ads.banner[bid];
						if(!banner)
							continue;
						if(!banner.active)
							continue;
						if(banner.inventory.indexOf(inv.id)>=0) {
							for(var iid in banner.images) {
								var image = banner.images[iid];
								if(!image)
									continue;
								if(image.size==inv.size)
									banners[bid] = 1; 
							}
						}
					}
					for(var cid in $scope.data.ads.campaign) {
						var campaign = $scope.data.ads.campaign[cid];
						if(!campaign)
							continue;
						if(!campaign.active)
							continue;
						for(var bid in banners)
							if(campaign.banners.indexOf(bid)>=0)
								campaigns[cid] = 1;
					}
				}
				$scope.inventoryUsage[invId] = {
					banners: banners,
					campaigns: campaigns,
					roll: uroll,
				};
			}
		}
		
		function CountProps(object) {
			var count = 0;
			for(var i in object)
				count++;
			return count;
		}

		$scope.campaignTooltip = function(cam) {
			var tooltip = '<div style="width: 400px;text-align:left">';
			var usage = $scope.campaignUsage[cam.id];
			var inventoryCount = CountProps(usage.inventory);
			var bannersCount = CountProps(usage.banners);
			if(bannersCount>0) {
				tooltip += '<div><strong>Banners:</strong></div><div>';
				var banners = [];
				for(var bid in usage.banners)
					banners.push($scope.data.ads.banner[bid].hid);
				tooltip += banners.join(", ");			
				tooltip += '</div>';
			}
			if(inventoryCount>0) {
				tooltip += '<div><strong>Inventory:</strong></div><div>';
				var inventory = [];
				for(var iid in usage.inventory) {
					var str = $scope.data.ads.inventory[iid].hid;
					str += " ("+($scope.campaignUsage[cam.id].inventoryUsagePercent[iid] || 0)+"%)";
					inventory.push(str);
				}
				tooltip += inventory.join(", ");
				tooltip += '</div>';
			}

			if(bannersCount==0 && inventoryCount==0)
				tooltip += '<strong>Not used</strong>';
			tooltip += '</div>';
			return tooltip;
		}
		
		$scope.bannerTooltip = function(cam) {
			var tooltip = '<div style="width: 400px;text-align:left">';
			var usage = $scope.bannerUsage[cam.id];
			var inventoryCount = CountProps(usage.inventory);
			var campaignsCount = CountProps(usage.campaigns);
			if(campaignsCount>0) {
				tooltip += '<div><strong>Campaigns:</strong></div><div>';
				var campaigns = [];
				for(var cid in usage.campaigns)
					campaigns.push($scope.data.ads.campaign[cid].hid);
				tooltip += campaigns.join(", ");			
				tooltip += '</div>';
			}
			if(inventoryCount>0) {
				tooltip += '<div><strong>Inventory:</strong></div><div>';
				var inventory = [];
				for(var iid in usage.inventory)
					inventory.push($scope.data.ads.inventory[iid].hid);
				tooltip += inventory.join(", ");
				tooltip += '</div>';
			}
			if(campaignsCount==0 && inventoryCount==0)
				tooltip += '<strong>Not used</strong>';
			tooltip += '</div>';
			return tooltip;
		}
		
		$scope.inventoryTooltip = function(inv) {
			var tooltip = '<div style="width: 400px;text-align:left">';
			var usage = $scope.inventoryUsage[inv.id];
			var bannersCount = CountProps(usage.banners);
			var campaignsCount = CountProps(usage.campaigns);
			if(campaignsCount>0) {
				tooltip += '<div><strong>Campaigns:</strong></div><div>';
				var campaigns = [];
				for(var cid in usage.campaigns) {
					var campStr = $scope.data.ads.campaign[cid].hid;
					if(usage.roll.campaignPercent[cid])
						campStr += ' ('+ usage.roll.campaignPercent[cid] + '%)';
					campaigns.push(campStr);
				}
				tooltip += campaigns.join(", ");			
				tooltip += '</div>';
			}
			if(bannersCount>0) {
				tooltip += '<div><strong>Banners:</strong></div><div>';
				var banners = [];
				for(var bid in usage.banners)
					banners.push($scope.data.ads.banner[bid].hid);
				tooltip += banners.join(", ");
				tooltip += '</div>';
			}
			if(usage.roll.total>0) {
				tooltip += '<div><strong>Usage:</strong></div>';
				tooltip += '<div>'+usage.roll.perday + " imprs per day</div>";
				tooltip += '<div>Scheduled '+usage.roll.scheduledPercent+'%</div>';
				tooltip += '<div>Background '+usage.roll.backgroundPercent+'%</div>';
				tooltip += '<div>Missed no banner '+usage.roll.missedBannerPercent+'%</div>';
				tooltip += '<div>Missed no campaign '+usage.roll.missedCampaignPercent+'%</div>';
			}
			if(bannersCount==0 && campaignsCount==0 && usage.roll.total==0)
				tooltip += '<strong>Not used</strong>';
			tooltip += '</div>';
			return tooltip;
		}
		
		$scope.instantStats = function(what,id,period) {
			if(!$scope.data.stats[period])
				return "";
			var duration = $scope.data.stats[period].duration;
			var now = $scope.data.now;
			var instant = $scope.data.stats[period][what][id];
			if(!instant)
				return "";
			var currentDuration = now - instant.lastEnd;
			var missingDuration = Math.max(0,duration - currentDuration);
			var lastDuration = instant.lastEnd - instant.lastStart;
			var imprs = instant.current.impr;
			var clicks = instant.current.click;
			if(lastDuration>0) {
				imprs += Math.round(instant.last.impr * (missingDuration/lastDuration));
				clicks += Math.round(instant.last.click * (missingDuration/lastDuration));
			}
			if(currentDuration>duration) {
				imprs = 0;
				clicks = 0;
			}
			var str = clicks + "/" + imprs;
			if(imprs)
				str += " ("+Math.round(clicks*10000/imprs)/100+"%)";
			return str;
		}
		
		$scope.totalStats = function(what,id) {
			var totalStats = $scope.data.stats.total; 
			if(!totalStats)
				return "";
			var total = totalStats[what];
			var imprs = total.impr[id] || 0;
			var clicks = total.click[id] || 0;
			var str = clicks + "/" + imprs;
			if(imprs)
				str += " ("+Math.round(clicks*10000/imprs)/100+"%)";
			return str;
		}
		
		$scope.countries = [ // Taken from https://gist.github.com/unceus/6501985
             {name: 'Afghanistan', code: 'AF'},
             {name: 'Aland Islands', code: 'AX'},
             {name: 'Albania', code: 'AL'},
             {name: 'Algeria', code: 'DZ'},
             {name: 'American Samoa', code: 'AS'},
             {name: 'Andorra', code: 'AD'},
             {name: 'Angola', code: 'AO'},
             {name: 'Anguilla', code: 'AI'},
             {name: 'Antarctica', code: 'AQ'},
             {name: 'Antigua and Barbuda', code: 'AG'},
             {name: 'Argentina', code: 'AR'},
             {name: 'Armenia', code: 'AM'},
             {name: 'Aruba', code: 'AW'},
             {name: 'Australia', code: 'AU'},
             {name: 'Austria', code: 'AT'},
             {name: 'Azerbaijan', code: 'AZ'},
             {name: 'Bahamas', code: 'BS'},
             {name: 'Bahrain', code: 'BH'},
             {name: 'Bangladesh', code: 'BD'},
             {name: 'Barbados', code: 'BB'},
             {name: 'Belarus', code: 'BY'},
             {name: 'Belgium', code: 'BE'},
             {name: 'Belize', code: 'BZ'},
             {name: 'Benin', code: 'BJ'},
             {name: 'Bermuda', code: 'BM'},
             {name: 'Bhutan', code: 'BT'},
             {name: 'Bolivia', code: 'BO'},
             {name: 'Bosnia and Herzegovina', code: 'BA'},
             {name: 'Botswana', code: 'BW'},
             {name: 'Bouvet Island', code: 'BV'},
             {name: 'Brazil', code: 'BR'},
             {name: 'British Indian Ocean Territory', code: 'IO'},
             {name: 'Brunei Darussalam', code: 'BN'},
             {name: 'Bulgaria', code: 'BG'},
             {name: 'Burkina Faso', code: 'BF'},
             {name: 'Burundi', code: 'BI'},
             {name: 'Cambodia', code: 'KH'},
             {name: 'Cameroon', code: 'CM'},
             {name: 'Canada', code: 'CA'},
             {name: 'Cape Verde', code: 'CV'},
             {name: 'Cayman Islands', code: 'KY'},
             {name: 'Central African Republic', code: 'CF'},
             {name: 'Chad', code: 'TD'},
             {name: 'Chile', code: 'CL'},
             {name: 'China', code: 'CN'},
             {name: 'Christmas Island', code: 'CX'},
             {name: 'Cocos (Keeling) Islands', code: 'CC'},
             {name: 'Colombia', code: 'CO'},
             {name: 'Comoros', code: 'KM'},
             {name: 'Congo', code: 'CG'},
             {name: 'Congo, The Democratic Republic of the', code: 'CD'},
             {name: 'Cook Islands', code: 'CK'},
             {name: 'Costa Rica', code: 'CR'},
             {name: 'Cote D\'Ivoire', code: 'CI'},
             {name: 'Croatia', code: 'HR'},
             {name: 'Cuba', code: 'CU'},
             {name: 'Cyprus', code: 'CY'},
             {name: 'Czech Republic', code: 'CZ'},
             {name: 'Denmark', code: 'DK'},
             {name: 'Djibouti', code: 'DJ'},
             {name: 'Dominica', code: 'DM'},
             {name: 'Dominican Republic', code: 'DO'},
             {name: 'Ecuador', code: 'EC'},
             {name: 'Egypt', code: 'EG'},
             {name: 'El Salvador', code: 'SV'},
             {name: 'Equatorial Guinea', code: 'GQ'},
             {name: 'Eritrea', code: 'ER'},
             {name: 'Estonia', code: 'EE'},
             {name: 'Ethiopia', code: 'ET'},
             {name: 'Falkland Islands (Malvinas)', code: 'FK'},
             {name: 'Faroe Islands', code: 'FO'},
             {name: 'Fiji', code: 'FJ'},
             {name: 'Finland', code: 'FI'},
             {name: 'France', code: 'FR'},
             {name: 'French Guiana', code: 'GF'},
             {name: 'French Polynesia', code: 'PF'},
             {name: 'French Southern Territories', code: 'TF'},
             {name: 'Gabon', code: 'GA'},
             {name: 'Gambia', code: 'GM'},
             {name: 'Georgia', code: 'GE'},
             {name: 'Germany', code: 'DE'},
             {name: 'Ghana', code: 'GH'},
             {name: 'Gibraltar', code: 'GI'},
             {name: 'Greece', code: 'GR'},
             {name: 'Greenland', code: 'GL'},
             {name: 'Grenada', code: 'GD'},
             {name: 'Guadeloupe', code: 'GP'},
             {name: 'Guam', code: 'GU'},
             {name: 'Guatemala', code: 'GT'},
             {name: 'Guernsey', code: 'GG'},
             {name: 'Guinea', code: 'GN'},
             {name: 'Guinea-Bissau', code: 'GW'},
             {name: 'Guyana', code: 'GY'},
             {name: 'Haiti', code: 'HT'},
             {name: 'Heard Island and Mcdonald Islands', code: 'HM'},
             {name: 'Holy See (Vatican City State)', code: 'VA'},
             {name: 'Honduras', code: 'HN'},
             {name: 'Hong Kong', code: 'HK'},
             {name: 'Hungary', code: 'HU'},
             {name: 'Iceland', code: 'IS'},
             {name: 'India', code: 'IN'},
             {name: 'Indonesia', code: 'ID'},
             {name: 'Iran, Islamic Republic Of', code: 'IR'},
             {name: 'Iraq', code: 'IQ'},
             {name: 'Ireland', code: 'IE'},
             {name: 'Isle of Man', code: 'IM'},
             {name: 'Israel', code: 'IL'},
             {name: 'Italy', code: 'IT'},
             {name: 'Jamaica', code: 'JM'},
             {name: 'Japan', code: 'JP'},
             {name: 'Jersey', code: 'JE'},
             {name: 'Jordan', code: 'JO'},
             {name: 'Kazakhstan', code: 'KZ'},
             {name: 'Kenya', code: 'KE'},
             {name: 'Kiribati', code: 'KI'},
             {name: 'Korea, Democratic People\'s Republic of', code: 'KP'},
             {name: 'Korea, Republic of', code: 'KR'},
             {name: 'Kuwait', code: 'KW'},
             {name: 'Kyrgyzstan', code: 'KG'},
             {name: 'Lao People\'s Democratic Republic', code: 'LA'},
             {name: 'Latvia', code: 'LV'},
             {name: 'Lebanon', code: 'LB'},
             {name: 'Lesotho', code: 'LS'},
             {name: 'Liberia', code: 'LR'},
             {name: 'Libyan Arab Jamahiriya', code: 'LY'},
             {name: 'Liechtenstein', code: 'LI'},
             {name: 'Lithuania', code: 'LT'},
             {name: 'Luxembourg', code: 'LU'},
             {name: 'Macao', code: 'MO'},
             {name: 'Macedonia, The Former Yugoslav Republic of', code: 'MK'},
             {name: 'Madagascar', code: 'MG'},
             {name: 'Malawi', code: 'MW'},
             {name: 'Malaysia', code: 'MY'},
             {name: 'Maldives', code: 'MV'},
             {name: 'Mali', code: 'ML'},
             {name: 'Malta', code: 'MT'},
             {name: 'Marshall Islands', code: 'MH'},
             {name: 'Martinique', code: 'MQ'},
             {name: 'Mauritania', code: 'MR'},
             {name: 'Mauritius', code: 'MU'},
             {name: 'Mayotte', code: 'YT'},
             {name: 'Mexico', code: 'MX'},
             {name: 'Micronesia, Federated States of', code: 'FM'},
             {name: 'Moldova, Republic of', code: 'MD'},
             {name: 'Monaco', code: 'MC'},
             {name: 'Mongolia', code: 'MN'},
             {name: 'Montserrat', code: 'MS'},
             {name: 'Morocco', code: 'MA'},
             {name: 'Mozambique', code: 'MZ'},
             {name: 'Myanmar', code: 'MM'},
             {name: 'Namibia', code: 'NA'},
             {name: 'Nauru', code: 'NR'},
             {name: 'Nepal', code: 'NP'},
             {name: 'Netherlands', code: 'NL'},
             {name: 'Netherlands Antilles', code: 'AN'},
             {name: 'New Caledonia', code: 'NC'},
             {name: 'New Zealand', code: 'NZ'},
             {name: 'Nicaragua', code: 'NI'},
             {name: 'Niger', code: 'NE'},
             {name: 'Nigeria', code: 'NG'},
             {name: 'Niue', code: 'NU'},
             {name: 'Norfolk Island', code: 'NF'},
             {name: 'Northern Mariana Islands', code: 'MP'},
             {name: 'Norway', code: 'NO'},
             {name: 'Oman', code: 'OM'},
             {name: 'Pakistan', code: 'PK'},
             {name: 'Palau', code: 'PW'},
             {name: 'Palestinian Territory, Occupied', code: 'PS'},
             {name: 'Panama', code: 'PA'},
             {name: 'Papua New Guinea', code: 'PG'},
             {name: 'Paraguay', code: 'PY'},
             {name: 'Peru', code: 'PE'},
             {name: 'Philippines', code: 'PH'},
             {name: 'Pitcairn', code: 'PN'},
             {name: 'Poland', code: 'PL'},
             {name: 'Portugal', code: 'PT'},
             {name: 'Puerto Rico', code: 'PR'},
             {name: 'Qatar', code: 'QA'},
             {name: 'Reunion', code: 'RE'},
             {name: 'Romania', code: 'RO'},
             {name: 'Russian Federation', code: 'RU'},
             {name: 'Rwanda', code: 'RW'},
             {name: 'Saint Helena', code: 'SH'},
             {name: 'Saint Kitts and Nevis', code: 'KN'},
             {name: 'Saint Lucia', code: 'LC'},
             {name: 'Saint Pierre and Miquelon', code: 'PM'},
             {name: 'Saint Vincent and the Grenadines', code: 'VC'},
             {name: 'Samoa', code: 'WS'},
             {name: 'San Marino', code: 'SM'},
             {name: 'Sao Tome and Principe', code: 'ST'},
             {name: 'Saudi Arabia', code: 'SA'},
             {name: 'Senegal', code: 'SN'},
             {name: 'Serbia and Montenegro', code: 'CS'},
             {name: 'Seychelles', code: 'SC'},
             {name: 'Sierra Leone', code: 'SL'},
             {name: 'Singapore', code: 'SG'},
             {name: 'Slovakia', code: 'SK'},
             {name: 'Slovenia', code: 'SI'},
             {name: 'Solomon Islands', code: 'SB'},
             {name: 'Somalia', code: 'SO'},
             {name: 'South Africa', code: 'ZA'},
             {name: 'South Georgia and the South Sandwich Islands', code: 'GS'},
             {name: 'Spain', code: 'ES'},
             {name: 'Sri Lanka', code: 'LK'},
             {name: 'Sudan', code: 'SD'},
             {name: 'Suriname', code: 'SR'},
             {name: 'Svalbard and Jan Mayen', code: 'SJ'},
             {name: 'Swaziland', code: 'SZ'},
             {name: 'Sweden', code: 'SE'},
             {name: 'Switzerland', code: 'CH'},
             {name: 'Syrian Arab Republic', code: 'SY'},
             {name: 'Taiwan, Province of China', code: 'TW'},
             {name: 'Tajikistan', code: 'TJ'},
             {name: 'Tanzania, United Republic of', code: 'TZ'},
             {name: 'Thailand', code: 'TH'},
             {name: 'Timor-Leste', code: 'TL'},
             {name: 'Togo', code: 'TG'},
             {name: 'Tokelau', code: 'TK'},
             {name: 'Tonga', code: 'TO'},
             {name: 'Trinidad and Tobago', code: 'TT'},
             {name: 'Tunisia', code: 'TN'},
             {name: 'Turkey', code: 'TR'},
             {name: 'Turkmenistan', code: 'TM'},
             {name: 'Turks and Caicos Islands', code: 'TC'},
             {name: 'Tuvalu', code: 'TV'},
             {name: 'Uganda', code: 'UG'},
             {name: 'Ukraine', code: 'UA'},
             {name: 'United Arab Emirates', code: 'AE'},
             {name: 'United Kingdom', code: 'GB'},
             {name: 'United States', code: 'US'},
             {name: 'United States Minor Outlying Islands', code: 'UM'},
             {name: 'Uruguay', code: 'UY'},
             {name: 'Uzbekistan', code: 'UZ'},
             {name: 'Vanuatu', code: 'VU'},
             {name: 'Venezuela', code: 'VE'},
             {name: 'Vietnam', code: 'VN'},
             {name: 'Virgin Islands, British', code: 'VG'},
             {name: 'Virgin Islands, U.S.', code: 'VI'},
             {name: 'Wallis and Futuna', code: 'WF'},
             {name: 'Western Sahara', code: 'EH'},
             {name: 'Yemen', code: 'YE'},
             {name: 'Zambia', code: 'ZM'},
             {name: 'Zimbabwe', code: 'ZW'}
           ];
		$("body").on("click",function() {
			$(".tooltip").hide();
	    	$("[vdh-tooltip]").tooltip('hide');
		});
	}
]);

angular.module('EASApp').filter('toArray', function() { return function(obj) {
    if (!(obj instanceof Object)) return obj;
    var arr=[];
    for(var key in obj)
        arr.push(Object.defineProperty(obj[key], '$key', {__proto__: null, value: key}));
    return arr;
}});

angular.module('EASApp').directive('vdhTooltip', 
		[ 
		  function factory() {
		return {
			scope: true,
		    link: function(scope,element,attrs) {
		    	var tooltipHtml = scope.$eval(element.attr("vdh-tooltip"));
		    	element.attr("title",tooltipHtml);
		    	$(element[0]).tooltip({
					html: true,
					placement: "auto",
					container: "body",
		    	});
		    	scope.$on('$destroy',function() {
		    		$(element[0]).tooltip('hide');
			    	$(element[0]).tooltip('destroy');
		    	});
		    },
		}
	}]);

angular.module('EASApp').directive('vdhDateTimePicker', 
		[ 
		  function factory() {
		return {
            require: '?ngModel',
            template:
            	"<div class='input-group date'>"+
            	"  <input type='text'"+
                "     class='form-control'/>"+
                "  <span class='input-group-addon'>"+
             	"    <em class='glyphicon glyphicon-calendar'></em></span>"+
             	"</div>",
            scope: {},
            link: function (scope, elem, attrs,ngModel) {
            	var inputElem = $(elem[0].querySelector("input"));
                inputElem.datetimepicker({
                    pick12HourFormat: scope.pick12HourFormat,
                    language: scope.language,
                    useCurrent: scope.useCurrent
                });
                var button = $(elem[0].querySelector("span"));
                function Show() {
                	inputElem.data("DateTimePicker").show();
                }
                button.bind("click",Show);
                function Update() {
    				ngModel.$setViewValue(new Date(inputElem.data("DateTimePicker").date()).getTime());
                }
            	inputElem.bind("blur",Update);
                
                scope.$on('$destroy',function() {
                    button.unbind("click",Show);
                    inputElem.unbind("blur",Update);
                	inputElem.data("DateTimePicker").destroy();
                });

				ngModel.$render = function() {
					inputElem.data("DateTimePicker").date(new Date(ngModel.$viewValue || 0));
				}
            }
		}
	}]);

angular.module('EASApp').filter('propsFilter', function() {
	  return function(items, props) {
	    var out = [];

	    if (angular.isArray(items)) {
	      items.forEach(function(item) {
	        var itemMatches = false;

	        var keys = Object.keys(props);
	        for (var i = 0; i < keys.length; i++) {
	          var prop = keys[i];
	          var text = props[prop].toLowerCase();
	          if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
	            itemMatches = true;
	            break;
	          }
	        }

	        if (itemMatches) {
	          out.push(item);
	        }
	      });
	    } else {
	      // Let the output be the input untouched
	      out = items;
	    }

	    return out;
	  };
	});

angular.element(document).ready(function() {
	angular.bootstrap(document, ['EASApp']);
});
