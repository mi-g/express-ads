Express Ads
===========

*Express Ads* provides a lightweight simple way to deliver ads in an Express-based web site. It works with any template engine and
provides a nice admin interface.

# Features

- Multiple concurrent campaigns
- Multiple banners per campaign
- Multiple creatives per banner
- Several campaign types:
    + Number of prints within a period
    + Number of click within a period
    + Recurrent prints (like 10000 prints per day)
    + Recurrent clicks (like 100 clicks per day)
    + Background (weighted display on available inventory)
- Ads are distributed evenly over the period
- Page and session capping per banner and/or campaign
- Country/OS/Browser filtering
- Campaign optional start/end dates
- Real time prints and clicks statistics
- Full admin interface integrable to the site's existing admin
- Not relying on a specific database
- Robust to ad-blockers (ads served from the site itself)

## Screenshots

[![ScreenShot](https://eas.rocks/images/screenshot1-thumb.jpg)](https://eas.rocks/images/screenshot1.jpg)
[![ScreenShot](https://eas.rocks/images/screenshot2-thumb.jpg)](https://eas.rocks/images/screenshot2.jpg)
[![ScreenShot](https://eas.rocks/images/screenshot3-thumb.jpg)](https://eas.rocks/images/screenshot3.jpg)

# Using Express Ads (short version)

## App setup
```
var app = express();
...
require('express-ads')(app,{});
...
app.get('/content-path', function (req, res) {
	res.render(someTemplate, { 
		ad: req.deliverAd,
	});
});
app.listen(3000);
```

## Requesting an ad

### Using Jade as template engine

```
p
  | Ipsum lorem ...
| !{ ad('area-name') }
p
  | Ipsum lorem ...
```

### Using EJS as template engine

```
<p>Ipsum lorem ...</p>
<%- ad('area-name') %>
<p>Ipsum lorem ...</p>
```

## From the admin interface

- Open `http://your-domain.com/eas/admin'
- Create an area specifying the size
- Create a banner
- Add the area to the banner
- Setup the banner link
- Add one or more images to the banner with same size
- Create a campaign
- Add the banner to the campaign
- Reload the content page, ads should be displayed

# Using Express Ads (detailed version)

## Setting up in your web site

Setup express-ads in your application using:

```
var app = express();
...
require('express-ads')(app,options);
```

after doing so, the `req` object will contain the following new fields:
* `deliverAd`: a function that returns the HTML code to display (or not) an ad
* `expressAds`: access to global express-ads service

`deliverAd` takes 2 parameters: *areaName* and an optional *adParams* and returns immediately the HTML code for the ad to display. Note that it might be an empty string if the module decided that no ad should be displayed.
* `areaName` is the human name of an area that must have been created from the admin interface
* `adParams` an object with the following fields:

| Param | Default | Description |
| ----- | ------- | ----------- |
| `styles` | `null` | an object containing CSS styles and values to display the ad container |
| `classes` | `null` | an array of classes (as strings) to be applied to the ad container |
| `tag` | `null` | if set, the HTML element to be used for the ad container. By default, `<p>` is used for text inventory areas, `<div>` for other inventory types |

Note that those parameters (styles, classes, tags) can also be set tuned from the admin interface. It's up to you to choose whatever styling method you want to use.

`expressAds` is an object that provide access to a number of services:

| Param | Description |
| ----- | ----------- |
| `adminUI` | a function that returns the entire admin interface HTML code |
| `styles` | an array of strings representing the stylesheets to be included in the admin page |
| `stylesHTML` | like `styles` formatted as a single HTML string that loads the stylesheets |
| `scripts` | an array of strings representing the scripts to be included in the admin page |
| `scriptsHTML` | like `scripts` formatted as a single HTML string that loads the scripts |
| `saveStats` | a function to save manually the current stats. It takes a callback as parameter that is called when the save operation is done. Note that stats are automatically saved every minute, so this function is only useful when doing a shutdown of the application if you don't want to lose the last minute of stats |

When doing `require('express-ads')(app,options)`, `options` is an object that can contain the following fields:

| Param | Default | Description |
| ----- | ------- | ----------- |
| `path` | `"/eas"` | the base URL path where express-ads services are attached to |
| `adminPath` | `null` | by default (`null`), the express-ads admin interface can be accessed from `path`+`/admin` (if you did not change `path`, it is `/eas/admin`). You can set `adminPath` to any other path value, like `"/admin/eas`" |
| `auth` | passthrough function | a `function(req,res,next)` to authenticate the access to the express-ads admin interface. By default, this function is a passthrough (it calls `next()` directly). You can implement your own authenticator here (using *passport* for instance) or rely on your site's default security system to protect the path to the admin page. For instance, many sites protect globally everything under `/admin`, so if you define `adminPath` to `"/admin/eas"`, you are safe and you can set the `auth` function to `function(req,res,next) { next(); }` |
| `staticMaxAge` | `"1h"` | the cache duration for static resources |
| `rollBacklog` | `1000` | the service maintains a cache for the last events, so it can determine a statistical event rate used to serve ads evenly over a period |
| `rollExpire` | `172800000` | default corresponds to 2 days. Older entries are removed from the roll cache |
| `adblockerDetection` | `true` | whether the adblocker detection is activated. You can filter banners based on whether the user has an adblocker or not |
| `files` | | an object containing various data pathes (see below) |
| `files.ads` | `"ads.json"` | file where ads configuration data are kept |
| `files.stats` | `"stats.json"` | file where stats are kept |
| `files.images` | `"ads/images"` | directory where banner images are stored |
| `files.tmp` | `"ads/tmp"` | directory where banner images are temporarily stored |
| `debugDeliver` | `false` | if set to `true`, traces are printed to the console when an ad is to be picked for delivery |
| `debugData` | `false` | if set to `true`, the admin interface will display an additional containing the raw JSON data for ads config and stats |
| `debugLiveTemplate` | `false` | if set to `true`, it won't be necessary to restart the server app to see changes in the admin user interface |
| `imageMagick` | `false` | use *ImageMagik* to manipulate banner images. On *Ubuntu*, you can install *ImageMagick* with `apt-get install imagemagick` |

plus a number of parameters dedicated to integrating the express-ads admin interface to the site's admin (see below).

## Display an ad in the template

Whether you use Jade, EJS or any other templating system, you need to have access from your template to the express-ads *deliverAd* function:

```
app.get('/content-path', function (req, res) {
	res.render(someTemplate, { 
		ad: req.deliverAd,
	});
});
```

You can then request the ad display doing `!{ ad('area-name') }` (Jade) or `<%- ad('area-name') %>` (EJS).

It is a better practice to pass the styling options to the express-ads API `<%- ad('area-name',{classes:['ad-wrapper']}) %>`, rather than providing your own externally `<div class='ad-wrapper'><%- ad('area-name') %></div>` because if no ad is to be displayed (`ad()` returning an empty string) you might be left with unwanted paddings, margins, borders, ...

## Express-ads admin interface integration

By default, once express-ads is setup in your site, you can access the admin interface on `http://mysite.com/eas/admin`, however, since you site is likely to have its own admin user interface, you may want to integrate express-ads into it to keep a common look and feel.

The idea is to provide your own admin template and layout and insert it into your page:

```
app.get('/admin/ads-management', function (req, res) {
	res.render('ads-management-template, { 
		expressAds: req.expressAds,
	});
});
```

and in the template (Jade version):

```
  ...
  body
    ...
    | !{ expressAds.adminUI() }
    ...
    | !{ expressAds.scriptsHTML }
    | !{ expressAds.stylesHTML }
```

or (EJS version):

```
  ...
  <body>
    ...
    <%- expressAds.adminUI() %>
    ...
    <%- expressAds.scriptsHTML %>
    <%- expressAds.stylesHTML %>
  </body>
</html>
```

`expressAds.adminUI()` returns as a single string the whole required HTML to build the user interface, `expressAds.scriptsHTML` and `expressAds.stylesHTML` contains the scripts and styles for this page to run.

The express-ads admin page makes use of several common libraries that you may already have setup in your site template. You can prevent the scripts and styles to be loaded twice by specifying parameters `adminScripts` and `adminStyles` into `options` when calling `require('express-ads')(app,options)`.

The admin UI integration specific option parameters are:

| Param | Default | Description |
| ----- | ------- | ----------- |
| `standaloneAdminUI` | `true` | if set to `false` a default admin page is not provided |
| `adminScripts` | see below | an object to change or remove loaded scripts |  
| `adminStyles` | see below | an object to change or remove loaded styles |  

For instance, calling `require('express-ads')(app,{adminScripts:{jquery:null})` ensures `expressAds.scriptsHTML` does not contain the code to load *jquery*, assuming it is loaded by your own means.

The default list of scripts libraries is:

| Library | value |
| ------- | ----- |
| `jquery` | `https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.4/jquery.min.js` |
| `angular` | `https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.4.8/angular.min.js` |
| `angularSanitize` | `https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.4.8/angular-sanitize.min.js` |
| `bootstrap` | `https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/js/bootstrap.min.js` |
| `moment` | `https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.10.6/moment.min.js` |
| `bootstrapDateTimePicker` | `https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datetimepicker/4.17.37/js/bootstrap-datetimepicker.min.js` |
| `uiSelect` | `https://cdnjs.cloudflare.com/ajax/libs/angular-ui-select/0.13.2/select.min.js` |

For styles:

| Library | value |
| ------- | ----- |
| `fontAwesome` | `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/css/font-awesome.min.css` |
| `bootstrap` | `https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/css/bootstrap.min.css` |
| `bootstrapDateTimePicker` | `https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datetimepicker/4.17.37/css/bootstrap-datetimepicker.min.css` |
| `uiSelect` | `https://cdnjs.cloudflare.com/ajax/libs/angular-ui-select/0.13.2/select.min.css` |

## Using the admin interface

This is pretty straight forward. 

Basically you create an inventory area, specifying a size. Then, you create a banner, specifying type *Image*, fill-in details, including a target link, indicate which areas this banner can be displayed to, add images to the banner (only images with a size that fit an inventory area will be used), specify filters if you want to. Next, create a campaign, specifying a type, for instance, *Background*, the banners you want to use for this campaign and you are all set, express-ads should start delivering ads.

There are a few things that may not be obvious though.

When using a *Text* banner, that may contain several texts to be chosen randomly, if you simply specify a text like `This is the text of my ad`, the whole sentence will appear as a link. If you do `This is the [[text]] of [[my ad]]`, `text` and `my ad` will appear as links (to the target link you specified for the banner), while the remaining words will show up as normal text.

When specifying a target link for a banner, you can use the following placeholders:

| Placeholder | Replaced with |
| ----------- | ------------- |
| `{{INV}}` | the inventory area id | 
| `{{CAM}}` | the campaign id |
| `{{BAN}}` | the banner id |
| `{{IMA}}` | the creative (specific image or text) id |
| `{{ALL}}` | equivalent to `{{INV}}.{{CAM}}.{{BAN}}.{{IMA}}` |

# Limitations

- Express Ads is not intended to support multiple users editing ads from the admin interface at the same time
- In this early version, only plain images and text ads are supported

# Supporting Express Ads

This code is free for you to use. However, in order to ensure we can maintain it, we display an ad from us with a 1% probability on your non-text inventory. We ensure that the ads we display are clean and safe for any environment. Contact us `contact at eas.rocks` if you have a problem with that.
