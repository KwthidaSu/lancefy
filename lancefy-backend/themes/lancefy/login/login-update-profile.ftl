<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lancefy - Update account information</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css" />
</head>

<body class="lancefy-bg <#if message?has_content || messagesPerField.existsError('username','email','firstName','lastName')>has-message</#if>">

  <canvas id="fireflies"></canvas>

  <div class="login-wrapper">
    <div class="login-content">
      <div class="header">
        <h1 class="brand">Lancefy</h1>
        <p class="subtitle">${msg("loginProfileTitle")}</p>
      </div>

      <#if message?has_content>
        <div class="login-error">
          ${message.summary}
        </div>
      </#if>

      <form class="login-form" id="kc-update-profile-form" action="${url.loginAction}" method="post">
        <#if user.editUsernameAllowed>
          <div class="input-group">
            <label class="field-label" for="username">${msg('username')}</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="${msg('username')}"
              value="${(user.username!'')}"
              autocomplete="username"
              aria-invalid="<#if messagesPerField.existsError('username')>true<#else>false</#if>"
              required
            />
            <#if messagesPerField.existsError('username')>
              <div class="field-error">
                ${kcSanitize(messagesPerField.get('username'))?no_esc}
              </div>
            </#if>
          </div>
        </#if>

        <#if user.editEmailAllowed>
          <div class="input-group">
            <label class="field-label" for="email">${msg('email')}</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="${msg('email')}"
              value="${(user.email!'')}"
              autocomplete="email"
              aria-invalid="<#if messagesPerField.existsError('email')>true<#else>false</#if>"
              required
            />
            <#if messagesPerField.existsError('email')>
              <div class="field-error">
                ${kcSanitize(messagesPerField.get('email'))?no_esc}
              </div>
            </#if>
          </div>
        </#if>

        <div class="input-group">
          <label class="field-label" for="firstName">${msg('firstName')}</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            placeholder="${msg('firstName')}"
            value="${(user.firstName!'')}"
            autocomplete="given-name"
            aria-invalid="<#if messagesPerField.existsError('firstName')>true<#else>false</#if>"
            required
          />
          <#if messagesPerField.existsError('firstName')>
            <div class="field-error">
              ${kcSanitize(messagesPerField.get('firstName'))?no_esc}
            </div>
          </#if>
        </div>

        <div class="input-group">
          <label class="field-label" for="lastName">${msg('lastName')}</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            placeholder="${msg('lastName')}"
            value="${(user.lastName!'')}"
            autocomplete="family-name"
            aria-invalid="<#if messagesPerField.existsError('lastName')>true<#else>false</#if>"
            required
          />
          <#if messagesPerField.existsError('lastName')>
            <div class="field-error">
              ${kcSanitize(messagesPerField.get('lastName'))?no_esc}
            </div>
          </#if>
        </div>

        <button type="submit" class="primary-btn">
          <span>${msg("doSubmit")}</span>
        </button>

        <#if isAppInitiatedAction??>
          <button type="submit" class="secondary-btn" name="cancel-aia" value="true" formnovalidate>
            <span>${msg("doCancel")}</span>
          </button>
        </#if>
      </form>
    </div>
  </div>

  <script src="${url.resourcesPath}/js/fireflies.js"></script>
</body>
</html>
