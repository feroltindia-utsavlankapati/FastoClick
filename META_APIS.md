# Complete Meta/Facebook APIs You Used For TWOM

These are the APIs/endpoints you successfully used while building the TWOM Meta integration system.

---

# 1. OAuth Login API

Used for:
✅ Facebook Login
✅ User Authentication
✅ Permission Approval

## Endpoint

```txt id="jlwor1"
https://www.facebook.com/v25.0/dialog/oauth
```

---

# Parameters Used

| Parameter     | Purpose               |
| ------------- | --------------------- |
| client_id     | Meta App ID           |
| redirect_uri  | OAuth callback        |
| config_id     | Business Login config |
| response_type | token/code            |

---

# Example

```txt id="jlwor2"
https://www.facebook.com/v25.0/dialog/oauth?client_id=APP_ID&redirect_uri=CALLBACK_URL&config_id=CONFIG_ID&response_type=token
```

---

# 2. Exchange Short Token → Long-Lived Token

Used for:
✅ Production token lifecycle
✅ Long-lived authentication

## Endpoint

```txt id="jlwor3"
GET https://graph.facebook.com/v25.0/oauth/access_token
```

---

# Parameters

| Parameter         | Purpose           |
| ----------------- | ----------------- |
| grant_type        | fb_exchange_token |
| client_id         | App ID            |
| client_secret     | App Secret        |
| fb_exchange_token | Short token       |

---

# Example

```txt id="jlwor4"
https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN
```

---

# 3. Fetch User Pages

Used for:
✅ Fetch connected pages
✅ Generate Page Access Tokens

## Endpoint

```txt id="jlwor5"
GET https://graph.facebook.com/v25.0/me/accounts
```

---

# Example

```txt id="jlwor6"
https://graph.facebook.com/v25.0/me/accounts?access_token=USER_ACCESS_TOKEN
```

---

# Returns

✅ Page IDs
✅ Page Names
✅ Page Tokens

---

# 4. Create Facebook Post

Used for:
✅ Auto posting
✅ Scheduled posting

## Endpoint

```txt id="jlwor7"
POST https://graph.facebook.com/v25.0/PAGE_ID/feed
```

---

# Body

```json id="jlwor8"
{
  "message": "Hello from TWOM 🚀",
  "access_token": "PAGE_ACCESS_TOKEN"
}
```

---

# 5. Fetch Single Post Analytics

Used for:
✅ Likes
✅ Comments
✅ Shares
✅ Post content

## Endpoint

```txt id="jlwor9"
GET https://graph.facebook.com/v25.0/POST_ID
```

---

# Fields Used

```txt id="jlwos1"
message,created_time,shares,reactions.summary(true),comments.summary(true)
```

---

# Example

```txt id="jlwos2"
https://graph.facebook.com/v25.0/POST_ID?fields=message,created_time,shares,reactions.summary(true),comments.summary(true)&access_token=PAGE_ACCESS_TOKEN
```

---

# 6. Fetch Page Posts

Used for:
✅ TWOM dashboard feed
✅ Content history

## Endpoint

```txt id="jlwos3"
GET https://graph.facebook.com/v25.0/PAGE_ID/posts
```

---

# Example

```txt id="jlwos4"
https://graph.facebook.com/v25.0/PAGE_ID/posts?fields=message,created_time,shares,reactions.summary(true),comments.summary(true)&access_token=PAGE_ACCESS_TOKEN
```

---

# 7. Fetch Page Insights

Used for:
✅ Reach
✅ Engagement
✅ Impressions

## Endpoint

```txt id="jlwos5"
GET https://graph.facebook.com/v25.0/PAGE_ID/insights
```

---

# Metrics Used

```txt id="jlwos6"
page_impressions,page_engaged_users,page_post_engagements
```

---

# Example

```txt id="jlwos7"
https://graph.facebook.com/v25.0/PAGE_ID/insights?metric=page_impressions,page_engaged_users,page_post_engagements&access_token=PAGE_ACCESS_TOKEN
```

---

# 8. Fetch Comments

Used for:
✅ Comment management
✅ Engagement dashboard

## Endpoint

```txt id="jlwos8"
GET https://graph.facebook.com/v25.0/POST_ID/comments
```

---

# Example

```txt id="jlwos9"
https://graph.facebook.com/v25.0/POST_ID/comments?access_token=PAGE_ACCESS_TOKEN
```

---

# 9. Fetch Reactions

Used for:
✅ Reaction analytics
✅ Sentiment tracking

## Endpoint

```txt id="jlwot1"
GET https://graph.facebook.com/v25.0/POST_ID/reactions
```

---

# Example

```txt id="jlwot2"
https://graph.facebook.com/v25.0/POST_ID/reactions?access_token=PAGE_ACCESS_TOKEN
```

---

# 10. Upload Image Post

Used for:
✅ Image publishing
✅ Creative posting

## Endpoint

```txt id="jlwot3"
POST https://graph.facebook.com/v25.0/PAGE_ID/photos
```

---

# Body

```json id="jlwot4"
{
  "url": "IMAGE_URL",
  "caption": "Caption here",
  "access_token": "PAGE_ACCESS_TOKEN"
}
```

---

# 11. Upload Video Post (Future)

Used for:
✅ Video publishing
✅ Reels/videos

## Endpoint

```txt id="jlwot5"
POST https://graph.facebook.com/v25.0/PAGE_ID/videos
```

---

# 12. Facebook Login for Business Configurations

Used for:
✅ Modern Meta Business OAuth
✅ Permission configurations

## Dashboard Area

```txt id="jlwot6"
Facebook Login for Business → Configurations
```

---

# Permissions You Used

```txt id="jlwot7"
pages_show_list
pages_manage_posts
pages_read_engagement
business_management
email
```

---

# Token Types You Used

| Token                 | Purpose             |
| --------------------- | ------------------- |
| User Token            | login/auth          |
| Long-Lived User Token | stable auth         |
| Page Token            | posting & analytics |

---

# Final TWOM Meta Architecture

```txt id="jlwot8"
TWOM
→ Meta OAuth
→ User Token
→ Long-Lived Token
→ Page Token
→ Posting
→ Analytics
→ Scheduling
```

---

# Features TWOM Can Now Build

✅ Facebook Login
✅ Page Connection
✅ Auto Posting
✅ Scheduled Posting
✅ Analytics Dashboard
✅ Reactions Tracking
✅ Comments Tracking
✅ Content Feed
✅ Image Posting
✅ AI Content Analysis

---

# Future APIs To Add

## Instagram

* Instagram Graph API
* Reels publishing
* Instagram insights

## LinkedIn

* Organization posting API

## X/Twitter

* Tweet publishing API

## Pinterest

* Pin publishing API
