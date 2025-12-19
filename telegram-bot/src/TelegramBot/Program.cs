using Microsoft.Extensions.Options;
using TelegramBot;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<TelegramBotOptions>(
    builder.Configuration.GetSection(TelegramBotOptions.SectionName));

builder.Services.Configure<RssOptions>(
    builder.Configuration.GetSection(RssOptions.SectionName));

builder.Services.Configure<SupabaseOptions>(
    builder.Configuration.GetSection(SupabaseOptions.SectionName));

builder.Services.Configure<PollingOptions>(
    builder.Configuration.GetSection(PollingOptions.SectionName));

builder.Services.AddHttpClient<RssFeedService>();

builder.Services.AddHostedService<Worker>();

var host = builder.Build();
await host.RunAsync();
