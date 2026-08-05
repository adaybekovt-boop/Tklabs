export type TermsLanguage = "ru" | "en";

export const CURRENT_TERMS_VERSION = "2026-08-05";

export type TermsContent = {
  label: string;
  title: string;
  intro: string;
  effectiveDate: string;
  chooseLanguage: string;
  readAgreement: string;
  accept: string;
  accepted: string;
  requiredNotice: string;
  retry: string;
  unavailable: string;
  acceptanceError: string;
  versionLabel: string;
  languageName: string;
  sections: ReadonlyArray<{ title: string; paragraphs: ReadonlyArray<string> }>;
};

export const terms = {
  ru: {
    label: "Пользовательское соглашение",
    title: "Правила работы с TK LAB",
    intro: "Пожалуйста, внимательно прочитайте условия до начала работы с интерфейсом, моделями и связанными функциями TK LAB.",
    effectiveDate: "Редакция от 5 августа 2026 года",
    chooseLanguage: "Выберите язык соглашения",
    readAgreement: "Я прочитал(а) соглашение и принимаю его условия",
    accept: "Принять соглашение",
    accepted: "Соглашение принято",
    requiredNotice: "Продолжение работы возможно после выбора языка и принятия актуальной редакции соглашения.",
    retry: "Повторить проверку",
    unavailable: "Не удалось проверить статус согласия. Обновите страницу и повторите попытку.",
    acceptanceError: "Не удалось сохранить согласие. Проверьте соединение и повторите попытку.",
    versionLabel: "Версия",
    languageName: "Русский",
    sections: [
      {
        title: "1. Общие положения и заключение соглашения",
        paragraphs: [
          "Настоящее пользовательское соглашение (далее — «Соглашение») регулирует доступ к TK LAB, включая веб-интерфейс, AI Playground, каталог моделей, голосовой ввод, синтез речи, API, историю рабочих сессий и иные связанные функции (далее совместно — «Сервис»). Оператор Сервиса обозначается как TK LAB. Реквизиты оператора, контактный адрес и применимое право должны быть указаны в опубликованной карточке проекта или на странице контактов до коммерческого запуска.",
          "Нажимая кнопку принятия, создавая рабочую сессию после отображения условий или продолжая пользоваться Сервисом после уведомления о новой редакции, пользователь подтверждает, что ознакомился с Соглашением, понял его содержание и принимает его в полном объёме. Если пользователь не согласен с условиями, он должен прекратить использование Сервиса.",
          "Пользователь подтверждает, что обладает необходимой дееспособностью и полномочиями для заключения Соглашения. Если доступ предоставляется сотруднику или участнику команды, лицо, предоставившее доступ, отвечает за наличие соответствующих полномочий и соблюдение условий всеми участниками.",
        ],
      },
      {
        title: "2. Доступ к аккаунту и безопасность",
        paragraphs: [
          "Часть функций доступна только после входа через поддерживаемого провайдера идентификации. Пользователь обязан предоставлять достоверные данные, не передавать доступ к аккаунту третьим лицам и незамедлительно сообщать об утрате контроля над аккаунтом или подозрении на несанкционированный доступ.",
          "Оператор может применять уровни доступа, лимиты, очереди, платные или закрытые модели и дополнительные проверки. Доступ конкретного аккаунта не является обещанием постоянной доступности определённой модели или фиксированного объёма вычислений, если иное прямо не указано в отдельном тарифе или письменном предложении.",
        ],
      },
      {
        title: "3. Разрешённое использование",
        paragraphs: [
          "Сервис предназначен для законных исследовательских, образовательных, творческих и рабочих задач. Пользователь самостоятельно оценивает, подходит ли выбранная модель для конкретного запроса, и обязан проверять результат до его публикации, передачи третьим лицам или использования в значимом процессе.",
          "Запрещается использовать Сервис для нарушения закона, прав третьих лиц или безопасности инфраструктуры; для вредоносного программного обеспечения, фишинга, массового спама, обхода ограничений, несанкционированного доступа, преследования, дискриминации, выдачи себя за другое лицо, обработки чужих секретов без разрешения, а также для автоматизации действий, создающих неприемлемый риск для жизни, здоровья, финансов или прав человека.",
          "Запрещается проводить нагрузочные, сканирующие или иные тесты инфраструктуры без предварительного письменного разрешения. Пользователь не должен пытаться извлечь системные инструкции, ключи, внутренние журналы, персональные данные других лиц или иные сведения, не предназначенные для него.",
        ],
      },
      {
        title: "4. Запросы, результаты и ответственность пользователя",
        paragraphs: [
          "Пользователь сохраняет ответственность за содержание отправленных запросов, загруженных файлов, голосовых данных и иных материалов. Пользователь обязан иметь необходимые права и основания для передачи таких материалов Сервису и не должен передавать специальные категории персональных данных, платёжные реквизиты, пароли, токены, ключи доступа или коммерческие секреты, если такая передача не нужна и не разрешена законом и владельцем данных.",
          "Результаты модели могут быть неточными, неполными, устаревшими, вымышленными или не соответствовать задаче. Сервис не заменяет врача, адвоката, бухгалтера, инженера, специалиста по безопасности или иной квалифицированный источник. Нельзя принимать решения высокого риска только на основании результата модели без независимой проверки и участия компетентного специалиста.",
          "Если пользователь публикует или применяет результат, он обязан провести разумную проверку фактов, прав третьих лиц, лицензий, безопасности кода и соответствия результата цели использования. Пользователь самостоятельно отвечает за последствия использования результата в своём продукте, документе, коде или процессе.",
        ],
      },
      {
        title: "5. Интеллектуальные права и материалы",
        paragraphs: [
          "Пользователь сохраняет права на свои входные материалы в объёме, в котором они существовали до передачи Сервису, и предоставляет оператору ограниченное право обработать их исключительно для выполнения запроса, обеспечения работы, безопасности и диагностики Сервиса. Пользователь гарантирует, что такая обработка не нарушает права третьих лиц.",
          "Права на интерфейс, фирменное оформление, программный код, документацию, товарные обозначения и иные материалы TK LAB принадлежат оператору или соответствующим правообладателям. Соглашение не передаёт пользователю права собственности на эти материалы, кроме ограниченного права пользоваться Сервисом по назначению.",
          "В отношении результата модели применяются ограничения, установленные применимым правом, правилами провайдеров моделей и правами третьих лиц. Оператор не гарантирует, что результат является уникальным, охраноспособным, свободным от претензий или пригодным для регистрации прав.",
        ],
      },
      {
        title: "6. Персональные данные и рабочий контекст",
        paragraphs: [
          "Для авторизации и привязки доступа Сервис может обрабатывать имя, адрес электронной почты, фотографию профиля, технические идентификаторы, сведения о согласии с условиями и служебные журналы. Согласие с настоящим Соглашением фиксируется в аккаунте: сохраняются булев флаг принятия, время принятия, версия редакции и выбранный язык.",
          "История диалогов в текущей версии может храниться в локальном архиве браузера и не является гарантированной серверной резервной копией. Запросы, ответы, вложения и голосовые данные могут передаваться выбранному провайдеру модели в объёме, необходимом для формирования ответа. Пользователь должен ознакомиться с актуальной политикой конфиденциальности и условиями соответствующих провайдеров.",
          "Оператор принимает разумные технические и организационные меры защиты, однако ни один способ хранения и передачи данных не гарантирует абсолютную безопасность. При инциденте оператор действует в соответствии с применимым правом и доступной информацией о событии.",
        ],
      },
      {
        title: "7. Сторонние провайдеры и внешние ссылки",
        paragraphs: [
          "Для идентификации, генерации, голосовых функций, аналитики, доставки и размещения Сервис может использовать сторонние платформы. Такие платформы могут иметь собственные условия, политики, лимиты и правила хранения. Пользователь разрешает необходимые технические вызовы в рамках выбранной функции и понимает, что результат и доступность могут зависеть от внешнего провайдера.",
          "Ссылки на внешние ресурсы предоставляются для удобства и не означают одобрения их содержания. Оператор не отвечает за изменения, сбои, политику или безопасность внешнего ресурса, который не контролирует.",
        ],
      },
      {
        title: "8. Доступность, изменения и обслуживание",
        paragraphs: [
          "Сервис предоставляется по принципу доступности, а не как гарантия непрерывной работы. Возможны плановые работы, обновление моделей, задержки, ограничения провайдеров, ошибки сети, потеря локального состояния и иные обстоятельства. Оператор стремится предупреждать о существенных изменениях, но не гарантирует предварительное уведомление в каждом случае.",
          "Оператор может изменять интерфейс, функции, лимиты, список моделей и настоящее Соглашение. Каждой редакции присваивается версия. Если изменение существенно влияет на права или обязанности пользователя, при следующем входе будет запрошено новое принятие актуальной версии. До принятия новой версии функции, для которых согласие обязательно, могут быть недоступны.",
        ],
      },
      {
        title: "9. Приостановка и прекращение доступа",
        paragraphs: [
          "Оператор может временно ограничить или прекратить доступ при нарушении Соглашения, угрозе безопасности, злоупотреблении лимитами, требовании закона, подозрении на компрометацию аккаунта или необходимости защитить Сервис и других пользователей. По возможности оператор сообщает причину и предоставляет способ обратиться за пересмотром, если это не запрещено законом или не создаёт дополнительный риск.",
          "Пользователь может прекратить использование Сервиса в любое время. Прекращение доступа не отменяет обязательства, которые по своему характеру должны продолжать действовать, включая положения об ответственности, правах, конфиденциальности, разрешении споров и проверке результатов.",
        ],
      },
      {
        title: "10. Ограничение гарантий и ответственности",
        paragraphs: [
          "В пределах, разрешённых применимым правом, Сервис и результаты предоставляются «как есть» и «по мере доступности». Оператор не обещает безошибочность, непрерывность, пригодность для конкретной цели, сохранность каждого элемента истории, отсутствие вредоносного содержимого в сторонних материалах или достижение определённого экономического результата.",
          "В пределах, разрешённых законом, оператор не отвечает за косвенные, случайные, штрафные или последующие убытки, упущенную выгоду, потерю данных, репутационный ущерб или решения, принятые на основании непроверенного результата. Если ответственность оператора не может быть исключена, её размер ограничивается документированным прямым ущербом в пределах, установленных применимым правом и конкретным тарифом, если он есть.",
          "Ничто в Соглашении не исключает ответственность, которую нельзя исключить законом, включая ответственность за умышленное причинение вреда, нарушение обязательных прав потребителя или иные императивные гарантии.",
        ],
      },
      {
        title: "11. Порядок обращений и разрешение споров",
        paragraphs: [
          "Вопросы о работе, приватности или нарушении условий следует направлять через официальный контакт, опубликованный в Сервисе. В обращении желательно указать аккаунт, время события, маршрут и описание проблемы без отправки паролей, ключей и лишних персональных данных.",
          "Стороны стремятся сначала добросовестно урегулировать спор через обращение в поддержку. При отсутствии соглашения спор разрешается в порядке и юрисдикции, предусмотренных применимым правом и реквизитами оператора, опубликованными для соответствующего региона. Если обязательные нормы предоставляют пользователю дополнительные права, они сохраняются.",
        ],
      },
      {
        title: "12. Заключительные положения",
        paragraphs: [
          "Если отдельное положение Соглашения признано недействительным, это не делает недействительными остальные положения; стороны заменяют его допустимым положением, максимально близким к исходной цели. Неприменение оператором отдельного права не означает отказ от него в будущем.",
          "Актуальная версия Соглашения, дата и идентификатор редакции публикуются в интерфейсе TK LAB. При смене версии в базе аккаунта сохраняется только факт принятия текущей редакции и техническая история, необходимая для подтверждения этого факта, в соответствии с политикой конфиденциальности.",
        ],
      },
    ],
  },
  en: {
    label: "User Agreement",
    title: "Working with TK LAB",
    intro: "Please read these terms carefully before using the TK LAB interface, models, and related features.",
    effectiveDate: "Edition dated 5 August 2026",
    chooseLanguage: "Choose the agreement language",
    readAgreement: "I have read the agreement and accept its terms",
    accept: "Accept agreement",
    accepted: "Agreement accepted",
    requiredNotice: "You can continue after choosing a language and accepting the current edition of the agreement.",
    retry: "Check again",
    unavailable: "We could not verify your consent status. Refresh the page and try again.",
    acceptanceError: "We could not save your consent. Check the connection and try again.",
    versionLabel: "Version",
    languageName: "English",
    sections: [
      {
        title: "1. Scope and acceptance",
        paragraphs: [
          "This User Agreement (the “Agreement”) governs access to TK LAB, including the web interface, AI Playground, model catalogue, voice input, text-to-speech, API, working-session history, and related features (collectively, the “Service”). The Service operator is referred to as TK LAB. The operator’s legal identity, contact address, and governing law should be published in the project details or contact page before any commercial launch.",
          "By selecting the acceptance button, creating a working session after these terms are shown, or continuing to use the Service after notice of a new edition, the user confirms that they have read, understood, and accepted the Agreement in full. If the user does not agree, they must stop using the Service.",
          "The user confirms that they have the legal capacity and authority required to enter into this Agreement. If access is provided to a team member, the person granting access is responsible for having the necessary authority and for ensuring that participants follow these terms.",
        ],
      },
      {
        title: "2. Account access and security",
        paragraphs: [
          "Some features require sign-in through a supported identity provider. The user must provide accurate information, must not share account access, and must promptly report loss of control or suspected unauthorized access.",
          "The operator may apply access tiers, limits, queues, paid or private models, and additional checks. Access to an account is not a promise of continuous availability of a particular model or fixed computing capacity unless an applicable plan or written offer expressly says so.",
        ],
      },
      {
        title: "3. Acceptable use",
        paragraphs: [
          "The Service is intended for lawful research, educational, creative, and work-related tasks. The user decides whether a model is appropriate for a request and must review results before publishing, sharing, or using them in a material process.",
          "The user must not use the Service to violate law, third-party rights, or infrastructure security; create malware, phishing, mass spam, unauthorized access, harassment, discrimination, impersonation, or high-risk automation; process another person’s secrets without permission; or bypass safeguards and access limits.",
          "Load testing, scanning, or other infrastructure testing requires prior written permission. The user must not attempt to extract system instructions, keys, internal logs, other people’s personal data, or information that is not intended for them.",
        ],
      },
      {
        title: "4. Inputs, outputs, and user responsibility",
        paragraphs: [
          "The user remains responsible for prompts, uploaded files, voice data, and other submitted material. The user must have the rights and lawful basis needed to submit that material and must not submit passwords, tokens, access keys, payment data, or commercial secrets unless the transfer is necessary, lawful, and authorized by the data owner.",
          "Model outputs may be inaccurate, incomplete, outdated, fabricated, or unsuitable for the task. The Service does not replace a doctor, lawyer, accountant, engineer, security professional, or other qualified source. High-impact decisions must not rely only on an output without independent verification and competent review.",
          "When publishing or applying an output, the user must reasonably verify facts, third-party rights, licenses, code safety, and fitness for the intended use. The user is responsible for consequences of using an output in a product, document, codebase, or process.",
        ],
      },
      {
        title: "5. Intellectual property and materials",
        paragraphs: [
          "The user retains rights in input materials to the extent those rights existed before submission and grants the operator a limited right to process them only to fulfil the request, operate the Service, maintain safety, and diagnose failures. The user represents that this processing will not violate third-party rights.",
          "Rights in the interface, brand presentation, software, documentation, trademarks, and other TK LAB materials belong to the operator or applicable rights holders. This Agreement does not transfer ownership of those materials and grants only a limited right to use the Service as intended.",
          "Output rights are subject to applicable law, model-provider rules, and third-party rights. The operator does not guarantee that an output is unique, protectable, free of claims, or suitable for registration or commercial use.",
        ],
      },
      {
        title: "6. Personal data and working context",
        paragraphs: [
          "For authentication and access binding, the Service may process a name, email address, profile image, technical identifiers, consent records, and security logs. Consent to this Agreement is recorded in the account: a boolean acceptance flag, acceptance time, edition version, and selected language are stored.",
          "In the current version, conversation history may be stored in the browser’s local archive and is not guaranteed to be a server backup. Prompts, outputs, attachments, and voice data may be sent to a selected model provider as needed to produce a response. The user should review the current privacy policy and the terms of relevant providers.",
          "The operator uses reasonable technical and organizational safeguards, but no storage or transmission method guarantees absolute security. If an incident occurs, the operator will act according to applicable law and the information reasonably available at the time.",
        ],
      },
      {
        title: "7. Third-party providers and links",
        paragraphs: [
          "The Service may rely on third-party platforms for identity, generation, voice features, analytics, delivery, and hosting. Those platforms may have separate terms, policies, limits, and retention practices. The user authorizes the technical calls necessary for a selected feature and understands that availability and results may depend on an external provider.",
          "External links are provided for convenience and do not constitute an endorsement. The operator is not responsible for changes, outages, policies, or security of resources it does not control.",
        ],
      },
      {
        title: "8. Availability, maintenance, and changes",
        paragraphs: [
          "The Service is provided on an availability basis, not as a guarantee of uninterrupted operation. Planned maintenance, model updates, provider limits, network failures, loss of local state, and other events may occur. The operator aims to provide notice of material changes but cannot guarantee advance notice in every case.",
          "The operator may change the interface, features, limits, model catalogue, and this Agreement. Each edition receives a version identifier. If a change materially affects user rights or duties, the next sign-in will require acceptance of the current edition. Features that require consent may remain unavailable until acceptance.",
        ],
      },
      {
        title: "9. Suspension and termination",
        paragraphs: [
          "The operator may limit or end access when the Agreement is breached, security is threatened, limits are abused, the law requires it, an account may be compromised, or action is needed to protect the Service and other users. Where possible, the operator will explain the reason and provide a review path unless doing so is unlawful or creates additional risk.",
          "The user may stop using the Service at any time. Ending access does not cancel provisions that by their nature should survive, including provisions about responsibility, rights, privacy, disputes, and verification of results.",
        ],
      },
      {
        title: "10. Disclaimers and limitation of liability",
        paragraphs: [
          "To the extent permitted by law, the Service and outputs are provided “as is” and “as available”. The operator does not promise error-free or uninterrupted operation, fitness for a particular purpose, preservation of every history item, absence of harmful content in third-party material, or a particular economic outcome.",
          "To the extent permitted by law, the operator is not liable for indirect, incidental, punitive, or consequential losses, lost profits, data loss, reputational harm, or decisions based on an unverified output. If liability cannot be excluded, it is limited to documented direct loss within the limits required by applicable law and any applicable plan.",
          "Nothing in this Agreement excludes liability that cannot legally be excluded, including liability for intentional harm, violation of mandatory consumer rights, or other non-waivable guarantees.",
        ],
      },
      {
        title: "11. Contact and dispute resolution",
        paragraphs: [
          "Questions about operation, privacy, or violations should be sent through the official contact published in the Service. A request should include the account, approximate time, route, and a description of the issue without sending passwords, keys, or unnecessary personal data.",
          "The parties will first try to resolve a dispute in good faith through support. If no agreement is reached, the dispute will be handled under the applicable law and jurisdiction specified in the operator details published for the relevant region. Mandatory user protections remain unaffected.",
        ],
      },
      {
        title: "12. General terms",
        paragraphs: [
          "If a provision is held invalid, the remaining provisions remain effective and the parties will replace the invalid provision with a lawful provision closest to its original purpose. A failure to exercise a right is not a waiver of that right in the future.",
          "The current Agreement, effective date, and edition identifier are published in TK LAB. When the edition changes, the account stores the acceptance of the current edition and the technical history needed to evidence that fact, subject to the privacy policy.",
        ],
      },
    ],
  },
} satisfies Record<TermsLanguage, TermsContent>;

export function getTerms(language: TermsLanguage) {
  return terms[language];
}
