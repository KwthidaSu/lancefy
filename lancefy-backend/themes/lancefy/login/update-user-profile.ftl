<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lancefy - Update account information</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css" />
</head>

<body class="lancefy-bg <#if message?has_content || messagesPerField.exists('global')>has-message</#if>">

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
      <#elseif messagesPerField.exists('global')>
        <div class="login-error">
          ${kcSanitize(messagesPerField.get('global'))?no_esc}
        </div>
      </#if>

      <form class="login-form" id="kc-update-profile-form" action="${url.loginAction}" method="post">
        <#list profile.attributes as attribute>
          <div class="input-group">
            <#assign inputType = attribute.annotations.inputType!'text'>
            <#if inputType?starts_with("html5-")>
              <#assign inputType = inputType[6..]>
            </#if>
            <label class="field-label" for="${attribute.name}">${advancedMsg(attribute.displayName!'')}</label>
            <#if inputType == "textarea">
              <textarea
                id="${attribute.name}"
                name="${attribute.name}"
                placeholder="${advancedMsg(attribute.displayName!'')}"
                aria-invalid="<#if messagesPerField.existsError(attribute.name)>true<#else>false</#if>"
                <#if attribute.required>required</#if>
                <#if attribute.readOnly>disabled</#if>
              >${(attribute.value!'')}</textarea>
            <#else>
              <input
                type="${inputType}"
                id="${attribute.name}"
                name="${attribute.name}"
                placeholder="${advancedMsg(attribute.displayName!'')}"
                value="${(attribute.value!'')}"
                aria-invalid="<#if messagesPerField.existsError(attribute.name)>true<#else>false</#if>"
                <#if attribute.autocomplete??>autocomplete="${attribute.autocomplete}"</#if>
                <#if attribute.required>required</#if>
                <#if attribute.readOnly>disabled</#if>
              />
            </#if>
            <#if messagesPerField.existsError(attribute.name)>
              <div class="field-error">
                ${kcSanitize(messagesPerField.get(attribute.name))?no_esc}
              </div>
            </#if>
          </div>
        </#list>

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
