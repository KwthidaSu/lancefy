<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lancefy - Reset password</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css" />
</head>

<body class="lancefy-bg <#if message?has_content>has-message</#if>">

  <canvas id="fireflies"></canvas>

  <div class="login-wrapper">
    <div class="login-content">
      <div class="header">
        <h1 class="brand">Lancefy</h1>
        <p class="subtitle">Reset your password</p>
      </div>

      <#if message?has_content>
        <div class="login-error">
          ${message.summary}
        </div>
      </#if>

      <form class="login-form" action="${url.loginAction}" method="post">
        <div class="input-group">
          <label class="field-label" for="username">Email or Username</label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="Email or Username"
            autocomplete="username"
            autofocus
            value="${(auth.attemptedUsername!'')}"
            required
          />
        </div>

        <button type="submit" class="primary-btn">
          Send reset link
        </button>
      </form>

      <div class="footer">
        <span>Remembered your password?</span>
        <a href="${url.loginUrl}">Sign in</a>
      </div>
    </div>
  </div>

  <script src="${url.resourcesPath}/js/fireflies.js"></script>
</body>
</html>
