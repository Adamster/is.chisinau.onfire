# Telegram Bot (Azure App Service)

Skeleton for a Telegram bot that will poll RSS and request approval before writing to Supabase.

## Requirements

- .NET 10 preview
- Telegram bot token and chat ID
- RSS feed URL
- Supabase URL and service role key

## Configuration

Set values in `telegram-bot/src/TelegramBot/appsettings.json` or override via environment variables:

```
TelegramBot__Token=YOUR_BOT_TOKEN
TelegramBot__ChatId=YOUR_CHAT_ID
Rss__FeedUrl=https://example.com/rss.xml
Supabase__Url=https://your-project.supabase.co
Supabase__ServiceRoleKey=YOUR_SERVICE_ROLE_KEY
Polling__IntervalSeconds=300
```

## Run locally

```
cd telegram-bot/src/TelegramBot
dotnet run
```

## Build container (Azure App Service)

```
docker build -t telegram-bot -f telegram-bot/Dockerfile .
```
