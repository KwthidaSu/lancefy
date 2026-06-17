<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lancefy - Access Issue</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css" />
</head>
<body class="lancefy-bg has-message">
  <canvas id="fireflies"></canvas>

  <div class="login-wrapper">
    <div class="message-shell">
      <section class="message-card" aria-labelledby="message-title">
        <div class="message-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 8V12" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
          </svg>
        </div>

        <h2 id="message-title" class="message-title">${message.summary!"Something went wrong."}</h2>

        <div class="message-actions">
          <a class="primary-btn message-btn" href="${url.loginUrl!'#'}">Back to sign in</a>
          <button type="button" class="ghost-btn message-btn" onclick="window.history.back()">Go back</button>
        </div>
      </section>
    </div>
  </div>

  <script src="${url.resourcesPath}/js/fireflies.js"></script>
</body>
</html>
