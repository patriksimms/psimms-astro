---
title: 'GDPR compliant posthog tracking without consent'
description: 'A guide how to implement tracking via posthog which does not need a consent banner'
pubDate: 'Oct 21 2025'
heroImage: './posthog_without_consent.webp'
tags: ['engineering']
---
Analyzing your product usage is an integral part of improving your users experience and ensure a healthy development. Since most tracking tools are US based where GDPR is not as important as in the european union, it can be tricky to get started. Opposite to common belief, with a few adjustments it is also possible to use tools like posthog without the asking for the consent of the user!

## Tracking without users consent? How dare you!

Hold your horses. In the [first paragraph](https://dsgvo-gesetz.de/art-1-dsgvo/) of the german implementation of the GDPR (DSGVO) it is stated: 

> This Regulation lays down rules to protect natural persons with regard to the processing of personal data and to ensure the free movement of such data.

Notice the "personal data" in there. [Personal data describes](https://dsgvo-gesetz.de/art-4-dsgvo/) every kind of data which can be attached to natural human being, e.g. names, location data, medical information etc. So what does that mean in our engineering context? email-addresses, birth dates, location data, etc. All of this is information from a natural human beeing. 

For the case of product analytics we (mostly) do' 't care about this information. I want to track pageviews, clicks, interactions with forms or dead clicks. All of this data by default does not contain any personal data, it is not attachable to a real human. When we want to use any of this data, is it very simple: The GDPR does not apply to us! We (and the tools we might be using) do not process any personal data! Therefore we don't need any consent

But we have to make sure to stick to some patterns to prevent us from getting such personal data by accident!

## emails and other persistent identifiers

If you have a product which uses logins and therefore probably has access to emails and names, you need to have some form of consent during the sign-up anyway. Still you should make sure you use the personal data only where it is needed.

Tools like posthog imply in their docs that you should [attach the email](https://posthog.com/docs/product-analytics/identify) to your user profile while identifying. While you can do this, you have to put in additional efforts in your data privacy and consent banner, since Posthog would become a personal-data-processor.

Therefore the easiest solution: *use the hashed email address of the user!*

Note: For tools without logins it is much easier: You can generate persistent identifiers in your application. When you don't have any personal data attached to this user, it is just a random id. Regardless of how much click events or similar you track, there is no way to identify a natural person with it!

## IP Addresses

Couple of years ago there was a [famous ruling in germany](https://www.cookieyes.com/documentation/google-fonts-and-gdpr/) that using Google Font embeds requires consent from the user. The reason? While requesting the font from a google server, google gets access to the IP address of the user requesting the font. This cannot be prevented, it is the way how the HTTP protocol works. This means, every http request from the users browser to a tracking tool like posthog, posthog has access to the IP address. And since we cannot guarantee they don't store it somewhere (in fact, it gets attached by default to a user profile), this is a problem.

No way to prevent it? 

There is one. Glorious Reverse Proxy!

## Setting up Reverse Proxy as Next.js Middleware

Recently I worked on some Next.js app where we wanted to implement GDPR compliant posthog tracking. We stumbled upon [this help article](https://posthog.com/docs/advanced/proxy/nextjs-middleware).

![Schematic to understand how reverse tracking prevents posthog of getting the IP adress](./posthog_tracking.svg)

In this simplified schematic you can see how the flow of tracking events is with the Reverse Proxy setup.

1. In your code you call `posthog.capture` directly. This will submit an HTTP request to your reverse proxy. Since your Reverse Proxy is your nextjs webserver, which has access to the IP address either way (due to the nature of the HTTP protocol).
2. When your nextjs server detects the http request for a `posthog.capture` event, it basically stops the request which would normally go to eu.i.posthog.com. It copies all of the contents and sends the request from the nextjs server as a separate HTTP request. Again, due to the nature of HTTP, posthog has access to the IP address, but now the IP address comes from your nextjs server. Not the users IP address anymore!
3. You can check in posthog for any person the IP address. It should now be always the same and all should match the one from your nextjs server 🎉


