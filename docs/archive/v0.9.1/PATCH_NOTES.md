# v0.9.1 — AI chat interface regression fix

## Русский

- Исправлена критическая ошибка, из-за которой поле ввода AI-чата могло уходить за границу экрана на компьютерах.
- Убран двойной заголовок лаборатории.
- Стабилизированы размеры поля ввода; оно увеличивается только вместе с текстом.
- Голосовой ввод отделён от кнопки отправки.
- Панели истории, моделей и вложений больше не блокируют клики после закрытия.
- Дополнительные настройки чата свёрнуты.
- Черновик очищается только после принятия запроса клиентским контроллером.

## English

- Fixed a desktop issue that could push the AI chat composer outside the viewport.
- Removed the duplicated laboratory header.
- Stabilized composer dimensions.
- Separated voice input from send.
- Prevented closed overlays from intercepting clicks.
- Collapsed secondary chat settings.
- Cleared drafts only after an accepted submission.
