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

# Using Express Ads (short version)

## App setup
```
var app = express();
...
var ea = require('express-ads')(app);
...
app.get('/content-path', function (req, res) {
	res.render(someTemplate, { 
		ea: ea.deliver(req),
	});
});
app.listen(3000);
```

## Requesting an ad

### Using Jade as template engine

```
p
  | Ipsum lorem ...
| !{ ea('inventory-id') }
p
  | Ipsum lorem ...
```

### Using EJS as template engine

```
<p>Ipsum lorem ...</p>
<%- ea('inventory-id') %>
<p>Ipsum lorem ...</p>
```

## From the admin interface

- Open `http://your-domain.com/eas/admin'
- Create an inventory specifying the area size
- Create a banner
- Add the inventory to the banner
- Setup the banner link
- Add one or more images to the banner with same size
- Create a campaign
- Add the banner to the campaign
- Reload the content page, ads should be displayed

# Limitations

- Express Ads is not intended to support multiple users editing ads from the admin interface at the same time
- In this early version, only plain images ads are supported
