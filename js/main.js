function initializeSelect2() {
  $('.custom-select').select2({
    theme: 'bootstrap4',
    minimumResultsForSearch: Infinity,
    placeholder: 'Select your area',
    width: '100%',
    dropdownAutoWidth: true,
    templateResult: formatOption,
    templateSelection: formatOption
  });

  function formatOption(option) {
    if (!option.id) return option.text;
    return $('<span>' + option.text + '</span>');
  }
};
function initFactWidget() {
  const storageKey = "randomFact";
  const timeKey = "factTimestamp";
  const factDisplay = document.getElementById("facts-widget-content");
  const updateInterval = 10 * 1000; // 10 секунд
  const jsonFile = "../facts.json"; // Файл с фактами

  function getRandomFact(facts) {
      return facts[Math.floor(Math.random() * facts.length)];
  }

  function updateLocalStorage(fact) {
      localStorage.setItem(storageKey, fact);
      localStorage.setItem(timeKey, Date.now());
  }

  function loadFact(facts) {
      let savedFact = localStorage.getItem(storageKey);
      let savedTime = localStorage.getItem(timeKey);

      if (!savedFact || !savedTime || Date.now() - savedTime > updateInterval) {
          savedFact = getRandomFact(facts);
          updateLocalStorage(savedFact);
      }

      if (factDisplay) {
          factDisplay.classList.remove('visible'); // Скрываем старый факт
          setTimeout(() => {
              factDisplay.textContent = savedFact;
              factDisplay.classList.add('visible'); // Плавно показываем новый факт
          }, 500); // Ждем полсекунды, прежде чем показывать новый факт
      }
  }

  function updateFact(facts) {
      const newFact = getRandomFact(facts);
      updateLocalStorage(newFact);

      if (factDisplay) {
          factDisplay.classList.remove('visible'); // Скрываем старый факт
          setTimeout(() => {
              factDisplay.textContent = newFact;
              factDisplay.classList.add('visible'); // Плавно показываем новый факт
          }, 500); // Ждем полсекунды, прежде чем показывать новый факт
      }
  }

  function fetchFacts() {
      fetch(jsonFile)
          .then(response => response.json())
          .then(facts => {
              if (!Array.isArray(facts) || facts.length === 0) {
                  console.error("Файл JSON пустой или не содержит массив.");
                  return;
              }
              loadFact(facts);
              setInterval(() => updateFact(facts), updateInterval);
          })
          .catch(error => console.error("Ошибка загрузки JSON:", error));
  }

  // Загружаем факты из JSON
  fetchFacts();
}

document.addEventListener("DOMContentLoaded", function () {
  initFactWidget();
  initializeSelect2();
  const popupMessage = document.getElementById("popupMessage");
  const closePopup = document.getElementById("closePopup");
  const quotePopupOverlay = document.getElementById("quotePopupOverlay");
  const quoteOpenPopup = document.querySelectorAll(".quoteOpenPopup");
  const quotePopupContainer = document.getElementById("quotePopupContainer");
  const successMessage = popupMessage.querySelector("p");
  const successTitle = popupMessage.querySelector("h6");

  function loadTemplate(callback) {
    fetch("/index.html") // Загружаем главную страницу
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const template = doc.getElementById("quoteFormTemplate");
        if (template) {
          callback(template.content.cloneNode(true));
        }
      })
      .catch(error => console.error("Ошибка загрузки формы:", error));
  }

  quoteOpenPopup.forEach(button => {
    button.addEventListener("click", function () {
      loadTemplate(formClone => {
        quotePopupContainer.innerHTML = ""; // Очищаем контейнер
        quotePopupContainer.appendChild(formClone); // Вставляем форму
        quotePopupOverlay.style.display = "flex"; // Показываем popup
        document.body.style.overflow = "hidden";
        const recaptchaElement = quotePopupContainer.querySelector(".g-recaptcha");
        if (recaptchaElement) {
          grecaptcha.render(recaptchaElement, {
            sitekey: "6Lf6AeUqAAAAAEryUkwZ9GE4Tf0OBefqAHZJJn68"
          });
        }
        initForm('quoteForm-t', 'Thank you! Our team will review your request and get back to you soon.', 'Quote Request Received!');
        initializeSelect2();
      });
    });
  });

  const initForm = (formId, successText, successTitleText) => {
    const form = document.getElementById(formId);

    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      try {
        const formData = new FormData(form);
        if (!formData.get('g-recaptcha-response')) {
          throw new Error('Complete the reCAPTCHA');
        }
        const response = await fetch(form.action, {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        console.log("Server response:", result);
        if (result.status === 'success') {
          successTitle.textContent = successTitleText;
          successMessage.textContent = successText;
          popupMessage.style.display = "flex";
          if (quotePopupOverlay){
          quotePopupOverlay.style.display = "none";
          }
          document.body.style.overflow = "hidden";
          
          form.reset();
          if (window.jQuery) {
            $('.custom-select').val("").trigger('change');
          }
          if (window.grecaptcha) grecaptcha.reset();
        } 
        else {
          throw new Error(result.message);
        }
      } 
      catch (error) {
        console.error("Ошибка отправки формы:", error);
        alert(error.message);
      } 
      finally {
        submitBtn.disabled = false;
      }
    });
  };

  initForm('quoteForm', 'Thank you! Our team will review your request and get back to you soon.', 'Quote Request Received!');
  initForm('contactForm', 'Thank you! We will contact you soon.', 'Message Received!');

  // Close popup message 
  closePopup.addEventListener("click", function () {
    popupMessage.style.display = "none";
    document.body.style.overflow = "auto";
  });

  // Close pupup form
  document.addEventListener("click", function (event) {
    if (event.target && event.target.id === "quoteClosePopup") {
      quotePopupOverlay.style.display = "none";
      document.body.style.overflow = "auto";
      if (window.jQuery) {
        $('.custom-select').val("").trigger('change');
      }
      if (window.grecaptcha) {
        grecaptcha.reset();
      }
    }
  });
  // Закрытие по клику вне попапов
  document.addEventListener("click", function (event) {
    if (event.target === popupMessage) {
      closePopup.click();
    }
    if (event.target === quotePopupOverlay) {
      quotePopupOverlay.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });  
});