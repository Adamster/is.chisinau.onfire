FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY telegram-bot/src/TelegramBot/TelegramBot.csproj ./TelegramBot/
RUN dotnet restore ./TelegramBot/TelegramBot.csproj
COPY telegram-bot/src/TelegramBot/ ./TelegramBot/
RUN dotnet publish ./TelegramBot/TelegramBot.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime:10.0-preview
WORKDIR /app
COPY --from=build /app/publish .
ENV DOTNET_EnableDiagnostics=0
ENTRYPOINT ["dotnet", "TelegramBot.dll"]
