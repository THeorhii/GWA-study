(function() {
  function StoreLocator() {
    var _this = this;
    this.dataJsonFileUrl = storesGlobal.dataJsonFileUrl;
    this.loadLocationData();
  };
  StoreLocator.prototype = $.extend({}, StoreLocator.prototype, {
    loadLocationData: function(){
      var _this = this;

      $.ajax({
        type: 'GET',
        url: _this.dataJsonFileUrl,
        dataType: 'json',
        success: function (data) {
          let allStates = [],
            allDistricts = [];

          $.each(data, function(state, district) {
            let stateId = state.toString().replace(/ /g,"_").toLowerCase(),
              districtsTab = $(`<div class="tab-panel" role="tabpanel" id=${stateId} aria-labelledby=${stateId} aria-hidden="true"></div>`),
              districtsList = $('<ul></ul>'),
              arrow = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="22" height="22"><defs><path d="m10.95 7-5.31 5.674a1 1 0 0 0 0 1.367l.06.064a.959.959 0 0 0 1.398 0L10.95 10l3.852 4.107a.959.959 0 0 0 1.4-.001l.06-.064a1 1 0 0 0 0-1.367L10.95 7z" id="A"/></defs><g fill-rule="evenodd"><mask id="B" fill="#fff"><use xlink:href="#A"/></mask><g mask="url(#B)" fill="#dcdcdc"><path d="M0 0h22v22H0z"/></g></g></svg>';

            allStates.push(`<a class="state-link" role="tab" aria-controls="${stateId}" aria-selected="false">${state} `+ arrow +`</a>`);

            allDistricts = $.map(district, (value) => `<li><a href="/pages/${value.districts.trim().replace(/ /g,"-").toLowerCase()}" class="district-link" data-district="${value.districts.trim().replace(/ /g,"-").toLowerCase()}">${value.districts}</a></li>`);

            districtsList.append(allDistricts);
            districtsTab.append(districtsList);
            $('.locations__districts').append(districtsTab);
          });

          $('.locations__states').append(allStates);

          $('.state-link:first').attr('aria-selected', 'true');
          $('.tab-panel:first').attr('aria-hidden', 'false');
        },
        error: function(error){
          console.log(error);
        }
      });
    }
  });
  return new StoreLocator();
})();

