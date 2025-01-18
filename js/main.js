$(function() {
  $('.custom-select').select2({
    theme: 'bootstrap4',
    minimumResultsForSearch: Infinity,
    placeholder: 'Select your area',
    width: '100%',
    dropdownAutoWidth: true,
 // Указываем тему
    templateResult: formatOption,
    templateSelection: formatOption
  });

  function formatOption(option) {
    if (!option.id) return option.text;
    return $('<span>' + option.text + '</span>');
  }
});