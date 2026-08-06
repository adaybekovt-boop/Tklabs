# v0.9.1 — AI chat interface regression fix

## Русский

- Исправлена критическая ошибка, из-за которой поле ввода AI-чата могло уходить за границу экрана на компьютерах.
- Убран двойной заголовок лаборатории.
- Стабилизированы размеры поля ввода; оно увеличивается только вместе с текстом.
- Голосовой ввод отделён от кнопки отправки.
- Панели истории, моделей и вложений вынесены из ограничивающих контейнеров и больше не должны блокировать клики после закрытия.
- Дополнительные настройки чата свёрнуты и не занимают постоянное место над полем ввода.
- Черновик очищается только после принятия запроса клиентским контроллером.

## English

- Fixed a critical desktop issue that could push the AI chat composer outside the visible viewport.
- Removed the duplicated laboratory header.
- Stabilized composer dimensions so it grows only with text.
- Separated voice input from the send action.
- Moved history, model, and attachment overlays outside clipped layout containers so they do not intercept clicks after closing.
- Collapsed secondary chat settings instead of permanently occupying composer space.
- Drafts are cleared only after the client request controller accepts a submission.
