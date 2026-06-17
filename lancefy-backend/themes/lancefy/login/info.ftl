<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lancefy - Notice</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css" />
</head>
<body class="lancefy-bg has-message">
  <canvas id="fireflies"></canvas>

  <div class="login-wrapper">
    <div class="message-shell">
      <section class="message-card" aria-labelledby="message-title">
        <div class="message-icon message-icon-info" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
            <path d="M12 10V16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="12" cy="7.2" r="1" fill="currentColor"/>
          </svg>
        </div>

        <h2 id="message-title" class="message-title">${message.summary!"Please review this notice."}</h2>

        <#if requiredActions?? && requiredActions?size gt 0>
          <div class="message-list">
            <#list requiredActions as reqActionItem>
              <div class="message-list-item">${kcSanitize(msg("requiredAction.${reqActionItem}"))?no_esc}</div>
            </#list>
          </div>
        </#if>

        <div class="message-actions">
          <#if (pageRedirectUri!'')?has_content>
            <a class="primary-btn message-btn" href="${pageRedirectUri!}">Continue</a>
          <#elseif (actionUri!'')?has_content>
            <a class="primary-btn message-btn" href="${actionUri!}">Continue</a>
          <#else>
            <a class="primary-btn message-btn" href="${url.loginUrl!'#'}">Back to sign in</a>
          </#if>
        </div>
      </section>
    </div>
  </div>

  <script src="${url.resourcesPath}/js/fireflies.js"></script>
</body>
</html>
