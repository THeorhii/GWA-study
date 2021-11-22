$(document).on('page:load', function() {
    window.slate = window.slate || {};
    slate.Currency = (function () {
        var moneyFormat = '${{amount}}';

        /**
         * Format money values based on your shop currency settings
         * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
         * or 3.00 dollars
         * @param  {String} format - shop money_format setting
         * @return {String} value - formatted value
         */
        function formatMoney(cents, format) {
            if (typeof cents === 'string') {
                cents = cents.replace('.', '');
            }
            var value = '';
            var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
            var formatString = (format || moneyFormat);

            /**
             * _.defaultTo from lodash
             * Checks `value` to determine whether a default value should be returned in
             * its place. The `defaultValue` is returned if `value` is `NaN`, `null`,
             * or `undefined`.
             * Source: https://github.com/lodash/lodash/blob/master/defaultTo.js
             *
             * @param {*} value - Value to check
             * @param {*} defaultValue - Default value
             * @returns {*} - Returns the resolved value
             */
            function defaultTo(value, defaultValue) {
                return (value == null || value !== value) ? defaultValue : value
            }

            function formatWithDelimiters(number, precision, thousands, decimal) {
                precision = defaultTo(precision, 2);
                thousands = defaultTo(thousands, ',');
                decimal = defaultTo(decimal, '.');

                if (isNaN(number) || number == null) {
                    return 0;
                }

                number = (number / 100.0).toFixed(precision);

                var parts = number.split('.');
                var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
                var centsAmount = parts[1] ? (decimal + parts[1]) : '';

                return dollarsAmount + centsAmount;
            }

            switch (formatString.match(placeholderRegex)[1]) {
                case 'amount':
                    value = formatWithDelimiters(cents, 2);
                    break;
                case 'amount_no_decimals':
                    value = formatWithDelimiters(cents, 0);
                    break;
                case 'amount_with_comma_separator':
                    value = formatWithDelimiters(cents, 2, '.', ',');
                    break;
                case 'amount_no_decimals_with_comma_separator':
                    value = formatWithDelimiters(cents, 0, '.', ',');
                    break;
            }

            return formatString.replace(placeholderRegex, value);
        }

        return {
            formatMoney: formatMoney
        };
    })();

    (function() {
        function CheckoutDelivery() {
            var _this = this;
            if (!Shopify.Checkout.step) {
                return;
            }
            this.strings = checkoutDeliveryGlobal.strings;
            this.customerAddresses = checkoutDeliveryGlobal.customerAddresses;
            this.deliveryAttributes = checkoutDeliveryGlobal.deliveryAttributes;
            this.deliveryNote = checkoutDeliveryGlobal.deliveryNote;
            this.shippingMethod = checkoutDeliveryGlobal.shippingMethod;
            this.deliveryDataUrl = checkoutDeliveryGlobal.deliveryDataUrl;
            this.subscriptionShippingMethod = checkoutDeliveryGlobal.subscriptionShippingMethod;
            this.standardShippingMethod = checkoutDeliveryGlobal.standardShippingMethod;
            this.subscriptionPaymentMethod = checkoutDeliveryGlobal.subscriptionPaymentMethod;
            this.checkboxAgreementEnable = checkoutDeliveryGlobal.checkboxAgreementEnable;

            //this.subscriptionLineItemAction = {{ subscription_line_item_action | json }};
            this.$body = $('body');
            this.$errorField = $('<p class="checkout-error" style="display:none;"></p>').insertAfter('.step__footer');

            setTimeout(function(){
                _this.$body.removeClass('checkout-loading');
            }, 15000);

            if (this.deliveryAttributes.delivery_location) {
                this.updateDeliveryLocation(this.deliveryAttributes.delivery_location);
            }

            this.insertDeliveryAttrs();

            $(document).on('page:change', function() {
                _this.insertDeliveryAttrs();
            });

            this.initCheckoutStep(Shopify.Checkout.step);

            // Checkout - Pop up (when customer already has subscription)
            _this.hasActiveSubscriptionsPopup = hasActiveSubscriptionsPopup;
            if (_this.hasActiveSubscriptionsPopup.enable) {
                _this.initActiveSubscriptionEvents();
            }

            $('.checkoutPermissionNote__field a').on('click', function (e) {
                e.preventDefault();
                _this.showPopUpAgreement();
            });
        }

        CheckoutDelivery.prototype = $.extend({}, CheckoutDelivery.prototype, {
            initActiveSubscriptionEvents: function () {
                var _this = this;
                var $emailOrPhoneInputs = $('#checkout_email_or_phone, #checkout_email');
                _this.subscriptionsPopup = $('#hasActiveSubscriptionsPopup');

                if ($emailOrPhoneInputs.length) {
                    if ($emailOrPhoneInputs.val() != '') {
                        _this.checkActiveSubscription($emailOrPhoneInputs.val());
                    }

                    $emailOrPhoneInputs.on('change', function () {
                        let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                        let inpVal = $(this).val().replace(/[^ -~]+/g, "").replace(/[^\x20-\x7E]+/g, '');
                        if (re.test(inpVal) && !(inpVal.trim() == null || inpVal.trim() == "" || inpVal === " ")) {
                            _this.checkActiveSubscription($(this).val());
                            getSpend();
                        }
                    });
                }

                _this.subscriptionsPopup.on('click', '.close-pop-up-icon, .btn-close', function (e) {
                    e.preventDefault();
                    _this.$body.removeClass('body-no-scroll');
                    _this.subscriptionsPopup.hide();
                });

                if (Shopify.Checkout.step != 'contact_information' && _this.hasActiveSubscriptionsPopup.customerEmail) {
                    _this.checkActiveSubscription(_this.hasActiveSubscriptionsPopup.customerEmail);
                }
            },

            checkActiveSubscription: function (value) {
                var _this = this;
                var email = encodeURI(value);
                if (!localStorage.getItem('wm_as_email') || localStorage.getItem('wm_as_email') != email) {
                    $.ajax({
                        type: "GET",
                        url: _this.hasActiveSubscriptionsPopup.getUrl,
                        data: {email: email},
                        success: function (response) {
                            localStorage.setItem('wm_as_email', email);
                            if (response.success && response.hasActiveSubscriptions) {
                                _this.subscriptionsPopup.show();
                                _this.$body.addClass('body-no-scroll');
                            } else {
                                console.log('POST ajax to check if the customer already has a subscription:', response.message != '' ? response.message : 'no active subscription');
                            }
                        }
                    });
                }
            },

            initCheckoutStep: function(step){
                var _this = this;
                var checkoutSteps = {
                    "contact_information": function(){
                        _this.initDeliveryLocation();
                        _this.initDeliveryBlocks(false);
                    },
                    "shipping_method": function() {
                        _this.showShippingMethod();
                        _this.updateDeliveryToBlock();
                        _this.initDeliveryBlocks(true);
                        $(document).on('page:change', function() {
                            _this.showShippingMethod();
                        });
                    },
                    "payment_method": function() {
                        _this.showPaymentMethod();
                        _this.initDeliveryBlocks(false);
                        $(document).on('page:change', function() {
                            _this.showPaymentMethod();
                        });
                    }
                };

                if (checkoutSteps[step]) {
                    $('.step__footer__continue-btn').attr('disabled', true);
                    if (!_this.stepCanBeInit(step)) return;
                    checkoutSteps[step]();
                    this.getDeliveryData(step);
                }
            },

            stepCanBeInit: function(step){
                if (!this.isLocationCorrect() && step != "contact_information" ){
                    window.location.search = 'step=contact_information';
                    return false;
                }
                if (step === "payment_method") {
                    if ((this.deliveryAttributes.cart_subscription === 'true' && (this.shippingMethod != this.subscriptionShippingMethod && this.shippingMethod != this.standardShippingMethod ))
                        || (this.deliveryAttributes.cart_subscription === 'false' && this.shippingMethod === this.subscriptionShippingMethod)
                        || (this.deliveryAttributes.cart_subscription === 'true' && ((checkoutDeliveryGlobal.deliveryAttributes.product_with_vendor_wm360 > 0 && this.shippingMethod != this.standardShippingMethod) || (checkoutDeliveryGlobal.deliveryAttributes.product_with_vendor_wm360 < 1 && this.shippingMethod != this.subscriptionShippingMethod) ))) {
                        window.location.search = 'step=shipping_method';
                        return false;
                    }
                }
//              if (this.subscriptionLineItemAction && step != "contact_information") {
//                  this.updateSubscriptionLineItem();
//                  return false;
//              }
                this.$body.removeClass('checkout-loading');
                return true;
            },

            changeCheckboxAgreement: function(checked) {
                var footerContinueBtn = $('.step__footer__continue-btn');
                var agreementCheckbox = $('.checkoutPermissionNote__field').find('.input-checkbox');
                if (this.deliveryAttributes.cart_subscription === 'true') {
                    if (checked) {
                        agreementCheckbox.prop('checked', 'checked').removeClass('input--red');
                        footerContinueBtn.removeAttr('disabled').removeClass('btn--disabled');
                    } else {
                        agreementCheckbox.removeAttr('checked').addClass('input--red');
                        footerContinueBtn.attr('disabled', true).addClass('btn--disabled');
                    }
                } else {
                    footerContinueBtn.removeAttr('disabled').removeClass('btn--disabled');
                }
            },

            closePopUpAgreement: function(){
                var _this = this;
                _this.$body.removeClass('body-no-scroll');
                $('.checkoutPermissionNote__pop-up').addClass('hide');
            },

            showPopUpAgreement: function() {
                var _this = this;
                _this.$body.addClass('body-no-scroll');
                $('.checkoutPermissionNote__pop-up').removeClass('hide');

                $('.checkoutPermissionNote__pop-up #btn-agree-checkout-permission').on('click', function(){
                    _this.changeCheckboxAgreement('checked');
                    _this.closePopUpAgreement();
                });
                $('.checkoutPermissionNote__pop-up .close-pop-up-icon').on('click', function(){
                    _this.closePopUpAgreement();
                })

            },

            initCheckboxAgreementEvents: function() {
                if (this.checkboxAgreementEnable) {
                    var checked = (!localStorage.getItem('wm_c_a') || localStorage.getItem('wm_c_a') == 0) ? false : true;
                    this.changeCheckboxAgreement(checked);

                    $('.checkoutPermissionNote__field').find('.input-checkbox').on('change', function(e){
                        var el = $(e.target);
                        localStorage.setItem('wm_c_a', el.prop('checked') ? 1 : 0);
                        this.changeCheckboxAgreement(el.prop('checked'));
                    }.bind(this));
                }
            },

            showShippingMethod: function(){
                var subscrShipMethodHandle = 'shopify-' + encodeURIComponent(this.subscriptionShippingMethod);
                var standShipMethodHandle = 'shopify-' + encodeURIComponent(this.standardShippingMethod);
                var $subscrShippMethodRadio = $('.input-radio[value^="' + subscrShipMethodHandle + '"]');
                var $standShippMethodRadio = $('.input-radio[value^="' + standShipMethodHandle + '"]');
                var shippingPrice, shippingPriceCents;
                var notSubscrShippMethod = $('[name="checkout[shipping_rate][id]"]').not($subscrShippMethodRadio);

                if (this.deliveryAttributes.cart_subscription === 'true') {
                    if (checkoutDeliveryGlobal.deliveryAttributes.product_with_vendor_wm360 > 0 ) {
                        $subscrShippMethodRadio.closest('.content-box__row').hide();
                        $standShippMethodRadio.closest('.content-box__row').show();
                        $standShippMethodRadio.prop('checked', true).trigger('change');
                        shippingPrice = $standShippMethodRadio.attr('data-checkout-total-shipping');
                        shippingPriceCents = parseInt($standShippMethodRadio.attr('data-checkout-total-shipping-cents'));
                    } else {
                        $subscrShippMethodRadio.closest('.content-box__row').show();
                        notSubscrShippMethod.closest('.content-box__row').hide();
                        $subscrShippMethodRadio.prop('checked', true).trigger('change');
                        shippingPrice = $subscrShippMethodRadio.attr('data-checkout-total-shipping');
                        shippingPriceCents = parseInt($subscrShippMethodRadio.attr('data-checkout-total-shipping-cents'));
                    }
                } else {
                    notSubscrShippMethod.closest('.content-box__row').show();
                    $subscrShippMethodRadio.closest('.content-box__row').hide();

                    var currentShippMethod = notSubscrShippMethod.first();
                    if (notSubscrShippMethod.length > 1 && $('[name="checkout[shipping_rate][id]"][data-checkout-total-shipping-cents="0"]').not($subscrShippMethodRadio).length > 0) {
                        currentShippMethod = $('[name="checkout[shipping_rate][id]"][data-checkout-total-shipping-cents="0"]').not($subscrShippMethodRadio);
                        notSubscrShippMethod.closest('.content-box__row').hide();
                        currentShippMethod.closest('.content-box__row').show();
                    }

                    currentShippMethod.prop('checked', true).trigger('change');
                    shippingPrice = currentShippMethod.attr('data-checkout-total-shipping');
                    shippingPriceCents = parseInt(currentShippMethod.attr('data-checkout-total-shipping-cents'));
                }

                if ($('[data-checkout-total-shipping-target]').length) {
                    $('[data-checkout-total-shipping-target]').text(shippingPrice).attr('data-checkout-total-shipping-target', shippingPriceCents);
                }
                if ($('[data-checkout-payment-due-target]').length) {
                    var subTotalPrice = parseInt($('[data-checkout-subtotal-price-target]').attr('data-checkout-subtotal-price-target'));
                    $('[data-checkout-payment-due-target]').text(slate.Currency.formatMoney(subTotalPrice + shippingPriceCents, checkoutDeliveryGlobal.moneyFormat)).attr('data-checkout-total-shipping-target', subTotalPrice + shippingPriceCents);
                }

                if ($('.section--shipping-method .content-box.blank-slate').length){
                    $('.section--shipping-method .content-box.blank-slate p').html('Please go back to the cart and add more meals.<br>The minimum order value is $60.');
                }

            },

            showPaymentMethod: function(){
                var $subscrPaymentMethodRadio = $('.input-radio[value="' + this.subscriptionPaymentMethod + '"]');
                var $subscrPaymMethodWrap = $subscrPaymentMethodRadio.closest('.radio-wrapper');
                var $subscrPaymentSubField = $('[data-subfields-for-gateway="' + this.subscriptionPaymentMethod + '"]');

                if (this.deliveryAttributes.cart_subscription === 'true') {
                    $subscrPaymentMethodRadio.prop('checked', true).trigger('change');
                    $subscrPaymentSubField.removeClass('hidden');
                    $('.section--payment-method .radio-wrapper').not($subscrPaymMethodWrap).not($subscrPaymentSubField).remove();
                }
                else {
                    $('[name="checkout[payment_gateway]"]').not($subscrPaymentMethodRadio).first().prop('checked', true).trigger('change');
                    $subscrPaymMethodWrap.remove();
                    $subscrPaymentSubField.remove();
                }
            },

            getDeliveryData: function(step){
                var _this = this;
                $.getJSON(_this.deliveryDataUrl, function(data){
                    _this.deliveryData = data;
                    _this.allLocations = [];
                    _this.allRegions = {};
                    data.regions.map(function(region){
                        _this.allLocations = _this.allLocations.concat(region.places);
                        _this.allRegions[region.name] = region;
                    });
                    $(document).trigger('deliveryDataLoaded');
                    if (!(_this.checkboxAgreementEnable && step == "shipping_method" && _this.deliveryAttributes.cart_subscription === 'true')) {
                        $('.step__footer__continue-btn').removeAttr('disabled');
                    }
                });
            },

            updateSubscriptionLineItem: function(){
                var _this = this;
                var action = this.subscriptionLineItemAction;

                function updateCart(cart) {
                    var prodArr = [];
                    if (action === 'add') {
                        prodArr = cart.items.slice(0,1);
                    }
                    else if (action === 'remove'){
                        prodArr = cart.items.filter(function(item){
                            return item.properties['_subscription'] === 'true';
                        });
                    }
                    if (prodArr.length) {
                        updateLineItems(prodArr);
                    }
                }

                function updateLineItems(prodArr){
                    if(prodArr.length){
                        var lineItem = prodArr.shift();
                        var productProps = lineItem.properties;
                        if (action === 'add') {
                            productProps['_subscription'] = 'true';
                            var product = {
                                line: 1,
                                properties: productProps
                            }
                        }
                        else if (action === 'remove'){
                            productProps['_subscription'] = 'false';
                            var product = {
                                id: lineItem.key,
                                properties: productProps
                            }
                        }
                        var ajaxParams = {
                            type: 'POST',
                            url: '/cart/change.js',
                            data: product,
                            dataType: 'json',
                            success: function() {
                                updateLineItems(prodArr);
                            },
                            error: function(XMLHttpRequest, textStatus) {

                            }
                        };
                        $.ajax(ajaxParams);
                    } else {
                        if (Shopify.Checkout.step === "payment_method") {
                            window.location.search = "step=shipping_method";
                        }
                        else if (Shopify.Checkout.step === "shipping_method") {
                            location.reload();
                        }
                        else {
                            _this.$body.removeClass('checkout-loading');
                        }
                    }
                }

                function getCart(callback) {
                    $.ajax({
                        type:     'GET',
                        url:      '/cart.js',
                        dataType: 'json',
                        success:  function (cart) {
                            callback(cart);
                        },
                        error:    function (XMLHttpRequest, textStatus) {
                            console.log(XMLHttpRequest, textStatus);
                        }
                    })
                }
                getCart(updateCart);
            },

            initDeliveryLocation: function () {
                var _this = this;
                this.addressFieldsSelectors = {
                    country: '#checkout_shipping_address_country',
                    state: '#checkout_shipping_address_province',
                    zip: '#checkout_shipping_address_zip',
                    city: '#checkout_shipping_address_city'
                };
                this.initSearchBox();
                this.fillAddressFields();

                $(document).on(
                  'deliveryDataLoaded', function(){
                      _this.checkCustomerAddresses();
                  }
                );
                $(document).on(
                  'page:change', function(){
                      _this.fillAddressFields();
                      _this.checkCustomerAddresses();
                  }

                );
            },

            checkCustomerAddresses: function(){
                if (!this.customerAddresses) {
                    return;
                }
                var _this = this;
                var availableAddresses = {};
                var $customerAddressesSelect = $('#checkout_shipping_address_id');
                var $customerAddressesOptions = $('option[data-properties]', $customerAddressesSelect);
                if (!$customerAddressesOptions.length){
                    return;
                }
                $.each(this.customerAddresses, function(ind, address){
                    if (address.country != 'Australia'){
                        return;
                    }

                    var addressString = address.city + ' ' + address.province_code + ' ' + address.zip;
                    var searchResults = _this.allLocations.filter(function(location){
                        var locationStr = location.split(',').map(function(item){return item.trim()}).join(' ').toLowerCase();
                        return locationStr.indexOf(addressString.toLowerCase()) >= 0;
                    });
                    if (searchResults.length) {
                        availableAddresses[address.id] = searchResults[0];
                    }
                });
                $customerAddressesOptions.each(function(){
                    var $option = $(this);
                    var optionAddressId = $option.attr('value');
                    if (availableAddresses[optionAddressId]) {
                        $option.attr('data-location', availableAddresses[optionAddressId])
                    }
                    else {
                        $option.attr('disabled', true);
                    }
                });
                $customerAddressesSelect.on('change', function(){
                    var selectedLocationId = $(this).val();
                    if (selectedLocationId && availableAddresses[selectedLocationId]) {
                        _this.fillAddressFields(availableAddresses[selectedLocationId]);
                        _this.updateDeliveryDatesBlock();
                    }

                });
            },

            fillAddressFields: function(deliveryLocation) {
                var $countrySelect = $(this.addressFieldsSelectors.country).addClass('autofill');
                var $stateSelect = $(this.addressFieldsSelectors.state).addClass('autofill');
                var $zipInput = $(this.addressFieldsSelectors.zip).addClass('autofill');
                var $cityInput = $(this.addressFieldsSelectors.city).addClass('autofill');
                var currentCountry = $countrySelect.val();
                var currentState = $stateSelect.val();

                $('.autofill').each(function(){
                    var inputName = $(this).attr('name');
                    $('[name="'+ inputName +'"]').removeAttr('autocomplete').removeAttr('data-autocomplete-field');
                });

                $('.autofill').attr('readonly', true).on('mousedown', function(e){
                    e.preventDefault();
                    this.blur();
                });

                if (deliveryLocation) {
                    this.updateDeliveryAttrs('delivery_location', deliveryLocation);
                    this.updateDeliveryAttrs('delivery_details', deliveryLocation);
                }

                if (currentCountry != 'Australia') {
                    $countrySelect.val('Australia').trigger('change');
                    Checkout.$(this.addressFieldsSelectors.country).trigger('change');
                    if (!this.deliveryLocation) {
                        return;
                    }
                    $(this.addressFieldsSelectors.state).val(this.deliveryLocation.state).trigger('change').on('mousedown', function(e){
                        e.preventDefault();
                        this.blur();
                    });
                }
                else if (this.deliveryLocation && currentState != this.deliveryLocation.state) {
                    $stateSelect.val(this.deliveryLocation.state).trigger('change');
                }

                if (!this.deliveryLocation) {
                    return;
                }

                $zipInput.val(this.deliveryLocation.zip).closest('.field').addClass('field--show-floating-label');
                $cityInput.val(this.deliveryLocation.suburb).closest('.field').addClass('field--show-floating-label');
                if (this.$searchInput) {
                    this.$searchInput.val(this.deliveryLocation.fullNoComa).closest('.field').addClass('field--show-floating-label');
                }

            },

            initSearchBox: function() {
                var _this = this;
                var $searchField = $('.search-field');
                var $searchInput = this.$searchInput = $('#search-location');
                var $resultBox = $('.search-result-box');

                function addSearchBox(){
                    $searchField.insertAfter('[data-address-field="last_name"]').show();
                }

                $resultBox.on('click', '.result-item', function(e){
                    var selectedLocation = $(this).attr('data-location');
                    $resultBox.hide();
                    _this.fillAddressFields(selectedLocation);
                    _this.updateDeliveryDatesBlock();
                });

                $searchInput.on('input', function(){
                    $resultBox.hide();
                    $resultBox.html('');
                    var term = $(this).val().toLowerCase();
                    if (term.length > 2) {
                        var termParts = term.split(' ');
                        var searchRes1 = _this.allLocations.map(function(location){
                            var searchRank = 0;
                            var allPartsFinded = true;
                            $.each(termParts, function(index, termPart){
                                var ind = location.toLowerCase().replace(/,/gi, '').indexOf(termPart);
                                if (ind >= 0) {
                                    searchRank += termPart.length;
                                }
                                else {
                                    allPartsFinded = false;
                                }
                            });
                            if (!allPartsFinded) {
                                var searchRank = 0;
                            }
                            return {
                                name: location,
                                searchRank: searchRank
                            }

                        });

                        var searchResults = searchRes1.filter(function(location){
                            return location.searchRank > 0;
                        });
                        searchResults.sort(function compare(a, b) {
                            if (a.searchRank > b.searchRank) return -1;
                            if (b.searchRank > a.searchRank) return 1;
                            return 0;
                        });
                    }
                    else {
                        return;
                    }
                    if (!searchResults.length){
                        return;
                    }
                    for (i=0; i < searchResults.length; i++) {
                        $('<div class="result-item" data-location="' + searchResults[i].name + '">' + searchResults[i].name.replace(/,/gi, '') + '</div>').appendTo($resultBox);
                    }
                    $resultBox.show();
                });

                $searchInput.on('keydown', function(e){
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        if (_this.deliveryLocation) {
                            $searchInput.val(_this.deliveryLocation.fullNoComa).closest('.field').addClass('field--show-floating-label');
                        }
                        $resultBox.hide();
                        return;
                    }
                    var $resultItems = $('.result-item');
                    if (!$resultItems.length){
                        return;
                    }
                    var isNavKey = false;
                    var $currentSelectedItem = $('.result-item-active');
                    var $nextItemToSelect;
                    if (e.key === 'ArrowDown') {
                        isNavKey = true;
                        if (!$currentSelectedItem.length || !$currentSelectedItem.next().length) {
                            $nextItemToSelect = $resultItems.first();
                        }
                        else {
                            $nextItemToSelect = $currentSelectedItem.next();
                        }
                    }
                    if (e.key === 'ArrowUp'){
                        isNavKey = true;
                        if (!$currentSelectedItem.length || !$currentSelectedItem.prev().length) {
                            $nextItemToSelect = $resultItems.last();
                        }
                        else {
                            $nextItemToSelect = $currentSelectedItem.prev();
                        }
                    }
                    if (isNavKey) {
                        e.preventDefault();
                        $currentSelectedItem.removeClass('result-item-active');
                        $nextItemToSelect.addClass('result-item-active');
                        $resultBox.scrollTop($nextItemToSelect[0].offsetTop);

                    }
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if ($currentSelectedItem.length) {
                            $currentSelectedItem.trigger('click');
                        }
                        return false;
                    }
                });

                $(document).on('mousedown', function(e){
                    if (!$searchInput.is(':focus')) {
                        return;
                    }
                    if (!$(e.target).hasClass('search-field') && !$(e.target).closest('.search-field').length) {
                        if (_this.deliveryLocation) {
                            $searchInput.val(_this.deliveryLocation.fullNoComa).closest('.field').addClass('field--show-floating-label');
                        }
                        $resultBox.hide();
                    }
                });

                $(document).on('page:change deliveryDataLoaded', function() {
                    addSearchBox();
                });
            },

            insertDeliveryAttrs: function() {
                var _this = this;
                var $beforeElem = $('.step__footer');
                this.$deliveryAttributes = this.$deliveryAttributes || {};
                $.each(this.deliveryAttributes, function(key, value){
                    if (!_this.$deliveryAttributes[key]) {
                        _this.$deliveryAttributes[key] = $('<input type="hidden" id="checkout_delivery_' + key + '" class="hidden-cart-attr" name="checkout[attributes][' + key + ']">');
                    }
                    _this.$deliveryAttributes[key].insertBefore($beforeElem).val(value);
                });
                if (Shopify.Checkout.step === "contact_information") {
                    var $checkoutNote = $('<div class="checkout-note"><label class="section__header section__title heading-2" for="checkout_note">' + this.strings.noteLabel + ' </label><textarea id="checkout_note" class="field__input" name="checkout[note]" rows="4">' + this.deliveryNote + '</textarea></div>').insertBefore($beforeElem);
                    $checkoutNote.find('textarea').on('input', function(){
                        _this.deliveryNote = $(this).val();
                    })
                }
            },

            updateDeliveryAttrs: function(attrName, value){
                var _this = this;
                if (arguments.length) {
                    this.$deliveryAttributes[attrName].val(value);
                    this.deliveryAttributes[attrName] = value;
                    if (attrName == 'delivery_location') {
                        this.updateDeliveryLocation(value);
                    }
                }else {
                    $.each(this.deliveryAttributes, function(key){
                        _this.$deliveryAttributes[key].val(_this.deliveryAttributes[key]);
                        if (attrName == 'delivery_location') {
                            _this.updateDeliveryLocation(value);
                        }

                    });
                }
            },

            updateDeliveryLocation: function(deliveryLocation){
                var _this = this;
                var deliveryLocationParts = deliveryLocation.split(',');
                this.deliveryLocation = {
                    full: deliveryLocation,
                    fullNoComa: deliveryLocation.replace(/,/gi, ''),
                    suburb: deliveryLocationParts[0].trim(),
                    state: deliveryLocationParts[1].trim(),
                    zip: deliveryLocationParts[2].trim(),
                    region: deliveryLocationParts[3].trim()
                };
                if (this.allRegions) {
                    this.deliveryRegionData = this.allRegions[this.deliveryLocation.region];
                }
            },

            isLocationCorrect: function() {
                var locationInReviewBlock = $('.review-block .address--tight').text().trim().toLowerCase();
                if (this.deliveryAttributes.delivery_location) {
                    var locationShouldBe = this.deliveryAttributes.delivery_location.split(',').map(function(item){return item.trim()}).slice(0, 3).join(' ').toLowerCase();
                }
                else {
                    var locationShouldBe = false;
                }
                if (!locationShouldBe || locationInReviewBlock.indexOf(locationShouldBe) < 0){
                    return false;
                };
                return true;
            },

            initDeliveryBlocks: function(showBlock){
                var _this = this;
                $(document).on(
                  'deliveryDataLoaded page:change', function(){
                      if (_this.deliveryLocation) {
                          _this.deliveryRegionData = _this.allRegions[_this.deliveryLocation.region];

                          _this.updateDeliveryDatesBlock(showBlock);

                      }else {
                          $('.step__footer__continue-btn').hide();
                      }

                      if (showBlock) {
                          _this.initSubscriptionBlock();
                          _this.initCheckboxAgreementEvents();
                      }
                  }
                );
            },

            updateDeliveryDatesBlock: function(showBlock) {
                var _this = this;
                var deliveryDates;
                if(_this.deliveryRegionData.regionDeliverySettings){
                    deliveryDates = this.getDeliveryDates('PerRegion');
                }else{
                    deliveryDates = this.getDeliveryDates();
                }

                this.$errorField.hide();
                if (this.$datesBlock) {
                    this.$datesBlock.html('');
                }else {
                    this.$datesBlock = $('<div class="delivery-dates-block"></div>');
                }
                if ($('.section--shipping-method .content-box.blank-slate').length) {
                    showBlock = false;
                }
                var $blockHeader = $('<div class="section__header"><h2 class="section__title">Delivery Day</h2><p class="section__subtitle">Click to select:</p></div>').appendTo(this.$datesBlock);
                var $blockInner = $('<div class="delivery-dates-block-inner"></div>').appendTo(this.$datesBlock);
                var $beforeElem = $('.step__footer');
                var months = ['January', "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                var days = ['Sunday', "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                var currentSelectedDate = this.deliveryAttributes.delivery_day ? this.deliveryAttributes.delivery_day.toLowerCase().replace('  ', ' ') : false;
                var currentDateAvail = false;
                var arr_7_days_regions = ['MEL METRO', 'MELBOURNE REGIONAL', 'BNE METRO', 'SYDNEY', 'SYD REGIONAL', 'SYD SOUTHWEST', 'GOLD COAST'];
                var regionTitle = _this.deliveryRegionData.name;
                var deliveryDaysToShow;
                var today_sdd = this.checkSameDayDelivery(_this.deliveryRegionData.regionDeliverySettings);

                var special_day;
                var check_days_count = 0;

                if(arr_7_days_regions.indexOf(regionTitle.toUpperCase()) > -1){
                    $blockInner.addClass('smaller-blocks');
                   /* if(today_sdd.arr_SDD.length>0 && today_sdd.arr_NDD.length>0){
                        deliveryDaysToShow = 4;
                    }
                    else*/

                    if(checkoutDeliveryGlobal.deliveryAttributes.wm360) {
                        deliveryDaysToShow = 6;
                    }else{
                        if (today_sdd.arr_NDD.length > 0) {
                            deliveryDaysToShow = 5;
                        } else {
                            deliveryDaysToShow = 6;
                        }
                    }
                }else{
                    /*if(today_sdd.arr_SDD.length>0 && today_sdd.arr_NDD.length>0){
                        deliveryDaysToShow = 1;
                    }*/
                    if(checkoutDeliveryGlobal.deliveryAttributes.wm360) {
                        deliveryDaysToShow = 3;
                    }else{
                        if (today_sdd.arr_NDD.length > 0) {
                        deliveryDaysToShow = 2;
                        } else {
                            deliveryDaysToShow = 3;
                        }
                    }
                }

                /*    if(today_sdd.arr_SDD.length>0){
                    var deliveryDate = [days[today_sdd.sdd_day.getDay()] + ',', today_sdd.sdd_day.getDate(), months[today_sdd.sdd_day.getMonth()]];
                    var deliveryDateStr = deliveryDate.join(' ');
                    var deliveryDateStrVal = deliveryDateStr+' '+today_sdd.sdd_day.getFullYear();
                    var deliveryDateHtml = '<p class="delivery-day-name">Same<br>day</p>';
                    var $dateBlockItem = $('<div class="delivery-dates-block-item"></div>');
                    var $dateLabel = $('<label for="delivery-day-sdd">' + deliveryDateHtml + '</label>');
                    var $dateInput = $('<input type="radio" class="same-day-delivery same-or-next-day" name="delivery-date" id="delivery-day-sdd" data-chosen="'+ today_sdd.sdd_day.getDay() +'">').val(deliveryDateStrVal);

                    if (currentSelectedDate === deliveryDateStrVal.toLowerCase()) {
                        $dateInput.prop('checked', true);
                        currentDateAvail = true;
                    }
                    var value_sdd = ($('.delivery-dates-block input[name="delivery-date"]:checked').hasClass('same-day-delivery')) ? true : false;
                    $dateInput.on('change', function(){
                        _this.updateDeliveryAttrs('delivery_day', $(this).val());
                        _this.updateDeliveryHoursBlock(showBlock);
                        value_sdd = ($(this).hasClass('same-day-delivery')) ? true : false;
                        _this.updateDeliveryAttrs('is_same_day_delivery', value_sdd);
                        if (value_sdd) {
                            _this.updateDeliveryAttrs('is_next_day_delivery', false);
                        }
                    });
                    $dateInput.appendTo($dateBlockItem);
                    $dateLabel.appendTo($dateBlockItem);
                    $blockInner.prepend($dateBlockItem);

                    this.specialDeliveryDay = deliveryDateStrVal;
                }
               */

                if(!checkoutDeliveryGlobal.deliveryAttributes.wm360) {
                    if (today_sdd.arr_NDD.length > 0) {
                        var deliveryDateN = [days[today_sdd.ndd_day.getDay()] + ',', today_sdd.ndd_day.getDate(), months[today_sdd.ndd_day.getMonth()]];
                        var deliveryDateStrN = deliveryDateN.join(' ');
                        var deliveryDateStrValN = deliveryDateStrN + ' ' + today_sdd.ndd_day.getFullYear();
                        var deliveryDateHtmlN = '<p class="delivery-day-name">' + deliveryDateN[0].slice(0, 3) + '</p>' + deliveryDateN[1] + '<br>' + deliveryDateN[2].slice(0, 3) + '';
                        var $dateBlockItemN = $('<div class="delivery-dates-block-item"></div>');
                        var $dateLabelN = $('<label for="delivery-day-ndd">' + deliveryDateHtmlN + '</label>');
                        var $dateInputN = $('<input type="radio" class="next-day-delivery same-or-next-day" name="delivery-date" id="delivery-day-ndd" data-chosen="' + today_sdd.ndd_day.getDay() + '">').val(deliveryDateStrValN);

                        if (currentSelectedDate === deliveryDateStrValN.toLowerCase()) {
                            $dateInputN.prop('checked', true);
                            currentDateAvail = true;
                        }
                        var block_for_ndd = $('.delivery-dates-block input[name="delivery-date"]:checked');
                        var value_ndd = (block_for_ndd.hasClass('next-day-delivery') || block_for_ndd.hasClass('after-next-day-delivery')) ? true : false;

                        $dateInputN.on('change', function () {
                            _this.updateDeliveryAttrs('delivery_day', $(this).val());
                            _this.updateDeliveryHoursBlock(showBlock);
                            value_ndd = ($(this).hasClass('next-day-delivery') || $(this).hasClass('after-next-day-delivery')) ? true : false;
                            _this.updateDeliveryAttrs('is_next_day_delivery', value_ndd);

                            if (value_ndd) {
                                _this.updateDeliveryAttrs('is_same_day_delivery', false);
                            }
                        });
                        $dateInputN.appendTo($dateBlockItemN);
                        $dateLabelN.appendTo($dateBlockItemN);
                        $blockInner.prepend($dateBlockItemN);

                        this.specialDeliveryDay = deliveryDateStrValN;
                    } else if (today_sdd.arr_after_NDD.length > 0) {
                        var deliveryDateN = [days[today_sdd.after_ndd_day.getDay()] + ',', today_sdd.after_ndd_day.getDate(), months[today_sdd.after_ndd_day.getMonth()]];
                        var deliveryDateStrN = deliveryDateN.join(' ');
                        var deliveryDateStrValN = deliveryDateStrN + ' ' + today_sdd.after_ndd_day.getFullYear();
                        var deliveryDateHtmlN = '<p class="delivery-day-name">' + deliveryDateN[0].slice(0, 3) + '</p>' + deliveryDateN[1] + '<br>' + deliveryDateN[2].slice(0, 3) + '';
                        var $dateBlockItemN = $('<div class="delivery-dates-block-item"></div>');
                        var $dateLabelN = $('<label for="delivery-day-ndd">' + deliveryDateHtmlN + '</label>');
                        var $dateInputN = $('<input type="radio" class="after-next-day-delivery same-or-next-day" name="delivery-date" id="delivery-day-ndd" data-chosen="' + today_sdd.after_ndd_day.getDay() + '">').val(deliveryDateStrValN);

                        special_day = deliveryDateStrValN;

                        if (currentSelectedDate === deliveryDateStrValN.toLowerCase()) {
                            $dateInputN.prop('checked', true);
                            currentDateAvail = true;
                        }
                        var value_ndd = ($('.delivery-dates-block input[name="delivery-date"]:checked').hasClass('next-day-delivery') || $('.delivery-dates-block input[name="delivery-date"]:checked').hasClass('after-next-day-delivery')) ? true : false;

                        $dateInputN.on('change', function () {
                            _this.updateDeliveryAttrs('delivery_day', $(this).val());
                            _this.updateDeliveryHoursBlock(showBlock);
                            value_ndd = ($(this).hasClass('next-day-delivery') || $(this).hasClass('after-next-day-delivery')) ? true : false;
                            _this.updateDeliveryAttrs('is_next_day_delivery', value_ndd);

                            if (value_ndd) {
                                _this.updateDeliveryAttrs('is_same_day_delivery', false);
                            }
                        });
                        $dateInputN.appendTo($dateBlockItemN);
                        $dateLabelN.appendTo($dateBlockItemN);
                        $blockInner.prepend($dateBlockItemN);
                    }
                }

                $('.step__footer__continue-btn').show();

                $.each(deliveryDates, function(index, timestamp){
                    var dateObj = new Date(timestamp);
                    var deliveryDate = [days[dateObj.getDay()] + ',', dateObj.getDate(), months[dateObj.getMonth()]];
                    var deliveryDateStr = deliveryDate.join(' ');
                    var deliveryDateStrVal = deliveryDateStr+' '+dateObj.getFullYear();
                    var deliveryDateHtml = deliveryDateStr.replace(deliveryDate[0], '<p class="delivery-day-name">' + deliveryDate[0].slice(0,3) + '</p>');
                    var labelText = '<p class="delivery-day-name">' + deliveryDate[0].slice(0,3) + '</p>';
                    var $dateBlockItem = $('<div class="delivery-dates-block-item"></div>');
                    var $dateLabel = $('<label for="delivery-day-' + index + '">' + labelText + ''+deliveryDate[1]+'<br>' + deliveryDate[2].slice(0,3) + '</label>');
                    var $dateInput = $('<input type="radio" name="delivery-date" id="delivery-day-' + index + '" data-chosen="'+ dateObj.getDay() +'">').val(deliveryDateStrVal);
                    if (currentSelectedDate === deliveryDateStrVal.toLowerCase()) {
                        $dateInput.prop('checked', true);
                        currentDateAvail = true;
                    }
                    $dateInput.on('change', function(){
                        _this.updateDeliveryAttrs('delivery_day', $(this).val());
                        _this.updateDeliveryHoursBlock(showBlock);
                    });
                    $dateInput.appendTo($dateBlockItem);
                    $dateLabel.appendTo($dateBlockItem);

                    if(deliveryDateStrVal != special_day){
                        $dateBlockItem.appendTo($blockInner);
                        check_days_count += 1;
                    }

                    if (index + 1 === deliveryDaysToShow) {
                        return false;
                    }
                });

                if (!deliveryDates.length) {
                    this.$errorField.text('Delivery is not available').show();
                    $('.step__footer__continue-btn').hide();
                    return;
                }else if (!currentDateAvail) {
                    if (Shopify.Checkout.step === "payment_method") {
                        $('.step__footer__continue-btn').hide();
                        window.location.search = "step=shipping_method";
                        return
                    }
                    this.$datesBlock.find('[name="delivery-date"]').first().prop('checked', true).trigger('change');
                }
                if (showBlock) {
                    this.$datesBlock.insertBefore($beforeElem);
                }

                if(special_day && check_days_count === deliveryDaysToShow ){
                    this.$datesBlock.addClass('hide-last-day-block')
                }

                setTimeout(function(){
                    _this.updateDeliveryHoursBlock(showBlock);
                }, 1000);

            },

            checkSameDayDelivery: function(region_info){
                var booking_day_t_z = this.kitchenDateNow;
                var next_day = new Date(+booking_day_t_z + 24 * 3600 * 1000);
                var after_next_day = new Date(+booking_day_t_z + 48 * 3600 * 1000);
                var today = booking_day_t_z.getDay();
                var tomorrow = today === 6 ? 0 : today + 1;
                var after_tomorrow = tomorrow === 6 ? 0 : today + 2;
                var arr_SDD_time = [];
                var arr_NDD_time = [];
                var arr_after_NDD_time = [];
                var today_hours = booking_day_t_z.getHours();
                var today_minutes = booking_day_t_z.getMinutes();

                $.each(region_info, function(ind, day){
                    if(day.sddAllowed && (day.delivery == today || day.delivery == tomorrow || day.delivery == after_tomorrow)){
                        $.each(day.deliveryHours, function(ind, time_block){
                            if(!time_block.title){
                                return;
                            }
                            if (day.delivery == today){
                                var time_block_hours = time_block.sddCutoff.split(':')[0];
                                var time_block_minutes = time_block.sddCutoff.split(':')[1];
                                if((time_block_hours>today_hours) || (time_block_hours == today_hours && today_minutes < time_block_minutes)){
                                    arr_SDD_time.push(time_block);
                                }
                            }else if (day.delivery == tomorrow) {
                                //arr_NDD_time.push(time_block);
                                var time_block_hours_ndd = time_block.nddCutoff.split(':')[0];
                                var time_block_minutes_ndd = time_block.nddCutoff.split(':')[1];
                                if((time_block_hours_ndd>today_hours) || (time_block_hours_ndd == today_hours && today_minutes < time_block_minutes_ndd)){
                                    arr_NDD_time.push(time_block);
                                }
                            }else if(day.delivery == after_tomorrow) {
                                arr_after_NDD_time.push(time_block);
                            }
                        });
                    }
                });

                var sdd_object = {
                     sdd_day : booking_day_t_z,
                     ndd_day : next_day,
                     after_ndd_day : after_next_day,
                     arr_SDD : arr_SDD_time,
                     arr_NDD : arr_NDD_time,
                     arr_after_NDD : arr_after_NDD_time,
                };

                return sdd_object;
            },

            getDeliveryDates: function(PerRegion) {
                var _this = this;
                var deliveryDaysToGet = 10;
                var skipDeliveryDates = ['29.12.2020', '30.12.2020', '31.12.2020', '1.1.2021', '2.1.2021', '3.1.2021', '4.1.2021', '5.1.2021'];
                var customerDateNow = new Date();
                var customerDateNowTimestamp = +customerDateNow;
                var customerTimeOffset = (0 - customerDateNow.getTimezoneOffset()) * 60 * 1000;
                var kitchenTimeOffset = this.deliveryData.general.time * 60 * 1000;
                var timeOffsetDiff = kitchenTimeOffset - customerTimeOffset;
                var kitchenDateNowTimestamp = customerDateNowTimestamp + timeOffsetDiff;
                var kitchenDateNow = new Date(kitchenDateNowTimestamp);
                var kitchenDayNumberNow = kitchenDateNow.getDay();
                var kitchenTimeNow = (kitchenDateNow.getHours() * 3600 + kitchenDateNow.getMinutes() * 60 + kitchenDateNow.getSeconds()) * 1000 + kitchenDateNow.getMilliseconds();
                var cutoffTimeArr = this.deliveryData.general.cutoff_time;
                var cutoffTime = (cutoffTimeArr[0] * 3600 + cutoffTimeArr[1] * 60 + cutoffTimeArr[2] * 1) * 1000;
                var kitchenDayNow = kitchenDateNow.getDay();
                var deliveryDays = [];
                var regionDays = [];

                _this.updateDeliveryAttrs('wm360', checkoutDeliveryGlobal.deliveryAttributes.wm360);

                this.kitchenDateNow = kitchenDateNow;

                if(PerRegion === 'PerRegion'){
                    $.each(this.deliveryRegionData.regionDeliverySettings, function (ind, regionDateVariant) {
                        var help_arr = [0, 1, 2, 3, 4, 5, 6];
                        if(help_arr.indexOf(regionDateVariant.cutoff) >=0 && help_arr.indexOf(regionDateVariant.delivery) >=0){
                            regionDays.push([regionDateVariant.cutoff, regionDateVariant.delivery]);
                        }
                    });
                }else{
                    regionDays = this.deliveryRegionData.days;
                }

                $.each(regionDays, function(ind, day){
                    var cutoffDay = +day[0];
                    var deliveryDay = +day[1];
                    var daysToDelivery = deliveryDay - kitchenDayNow;
                    var daysToCutoff = cutoffDay - kitchenDayNow;
                    if (daysToDelivery <= 0){
                        daysToDelivery += 7;
                    }
                    if (daysToCutoff < 0 || (daysToCutoff === 0 && kitchenTimeNow >= cutoffTime)) {
                        daysToCutoff += 7
                    }
                    if (daysToCutoff >= daysToDelivery){
                        daysToDelivery += 7;
                    }

                    if(checkoutDeliveryGlobal.deliveryAttributes.wm360){
                        if(daysToDelivery>4){
                            deliveryDays.push(kitchenDateNowTimestamp + daysToDelivery * 24 * 3600 * 1000 );
                        }
                    }else{
                        deliveryDays.push(kitchenDateNowTimestamp + daysToDelivery * 24 * 3600 * 1000 );
                    }
                });

                deliveryDays.sort();
                var additionalDaysNum = deliveryDaysToGet - deliveryDays.length;
                if (additionalDaysNum > 0) {
                    for (var i=0; i < additionalDaysNum; i++) {
                        deliveryDays.push(deliveryDays[i] + 7 * 24 * 3600 * 1000);
                    }
                }

                deliveryDays.sort();
                if (skipDeliveryDates && skipDeliveryDates.length){
                    deliveryDays = deliveryDays.filter(function(day){
                        var dateObj = new Date(day);
                        var checkedDateString = dateObj.getDate() + '.' + (dateObj.getMonth() + 1) + '.' + dateObj.getFullYear();
                        return skipDeliveryDates.indexOf(checkedDateString) < 0;
                    });
                }
                this.deliveryDays = deliveryDays;
                return deliveryDays;
            },

            updateDeliveryHoursBlock: function(showBlock){
                var _this = this;
                var deliveryHours = this.deliveryData.general.hours;
                var regionHours = this.deliveryRegionData.hours;
                var $beforeElem = $('.subscription-block');
                var $afterElem = $('.delivery-dates-block');

                if (this.$hoursBlock) {
                    this.$hoursBlock.html('');
                }else {
                   // $beforeElem = $('.step__footer');
                    this.$hoursBlock = $('<div class="delivery-hours-block">');
                }
                var $blockHeader = $('<div class="section__header"><h2 class="section__title">Delivery Hours</h2><p class="section__subtitle">Click to select:</p></div>').appendTo(this.$hoursBlock);

                var currentHoursAvail = false;
                var deliveryAvail = false;

                $('.step__footer__continue-btn').show();

                if(_this.deliveryRegionData.regionDeliverySettings){
                    var chosen_day = $('.delivery-dates-block input[name="delivery-date"]:checked').attr("data-chosen")*1;
                    var delivery_obj_hours;
                    var variants_delivery = this.deliveryRegionData.regionDeliverySettings;
                    var customerDateNow = new Date();
                    var customerDateNowTimestamp = +customerDateNow;
                    var customerTimeOffset = (0 - customerDateNow.getTimezoneOffset()) * 60 * 1000;
                    var kitchenTimeOffset = this.deliveryData.general.time * 60 * 1000;
                    var timeOffsetDiff = kitchenTimeOffset - customerTimeOffset;
                    var kitchenDateNowTimestamp = customerDateNowTimestamp + timeOffsetDiff;
                    var kitchenDateNow = new Date(kitchenDateNowTimestamp);

                    for(var i = 0; variants_delivery.length > i; i++){
                        var this_delivery = variants_delivery[i].delivery*1;
                        var this_day_allowed = variants_delivery[i].allowed;
                        if(this_day_allowed && this_delivery*1 == chosen_day){
                            delivery_obj_hours = variants_delivery[i].deliveryHours;
                        }
                    }

                    if($('.delivery-dates-block input[name="delivery-date"]:checked').hasClass('same-day-delivery')){
                        delivery_obj_hours = delivery_obj_hours.filter(function ( currentValue ) {
                            if(currentValue.sddTitle && currentValue.sddCutoff){
                                var sddCutoffHours = currentValue.sddCutoff.split(':')[0];
                                var sddCutoffMinutes = currentValue.sddCutoff.split(':')[1];
                                if ((kitchenDateNow.getHours() < sddCutoffHours) || (kitchenDateNow.getHours() == sddCutoffHours && kitchenDateNow.getMinutes() < sddCutoffMinutes)){
                                    return currentValue
                                }
                            }
                        });
                        if (delivery_obj_hours.length > 0){
                            _this.updateDeliveryAttrs('is_same_day_delivery', true);
                            _this.updateDeliveryAttrs('is_next_day_delivery', false);
                        }
                    }else if($('.delivery-dates-block input[name="delivery-date"]:checked').hasClass('next-day-delivery')){
                        delivery_obj_hours = delivery_obj_hours.filter(function ( currentValue ) {
                            if(currentValue.sddTitle && currentValue.sddCutoff){
                                var sddCutoffHours = currentValue.nddCutoff.split(':')[0];
                                var sddCutoffMinutes = currentValue.nddCutoff.split(':')[1];
                                if ((kitchenDateNow.getHours() < sddCutoffHours) || (kitchenDateNow.getHours() == sddCutoffHours && kitchenDateNow.getMinutes() < sddCutoffMinutes)){
                                    return currentValue
                                }
                            }
                        });
                        if (delivery_obj_hours.length > 0){
                            _this.updateDeliveryAttrs('is_same_day_delivery', false);
                            _this.updateDeliveryAttrs('is_next_day_delivery', true);
                        }
                    }else if($('.delivery-dates-block input[name="delivery-date"]:checked').hasClass('after-next-day-delivery')){
                        _this.updateDeliveryAttrs('is_same_day_delivery', false);
                        _this.updateDeliveryAttrs('is_next_day_delivery', true);
                    }else if(!$('.delivery-dates-block input[name="delivery-date"]:checked').hasClass('same-or-next-day') && $('div.step').attr('data-step') == "shipping_method"){
                        _this.updateDeliveryAttrs('is_same_day_delivery', false);
                        _this.updateDeliveryAttrs('is_next_day_delivery', false);
                    }

                    if(delivery_obj_hours){
                        $.each(delivery_obj_hours, function(ind, hours){
                            deliveryAvail = true;
                            var $title, $content;

                            if($('.delivery-dates-block input[name="delivery-date"]:checked').hasClass('same-or-next-day')){
                                $title = delivery_obj_hours[ind].sddTitle;
                                $content = (delivery_obj_hours[ind].sddHelpText) ? delivery_obj_hours[ind].sddHelpText : "";
                            }else{
                                $title = delivery_obj_hours[ind].title;
                                $content = delivery_obj_hours[ind].helpText;
                            }

                            var $hoursBlockItem = $('<div class="delivery-hours-block-item"></div>');
                            var $hoursLabel = $('<label for="delivery-hours-' + ind + '"><span class="delivery-hours-title">' + $title + '</span><span class="delivery-hours-info">' + $content + '</span></label>');
                            var $hoursInput = $('<input type="radio" name="delivery-hours" id="delivery-hours-' + ind + '">').val($title);
                            var $hoursRadioBtn = $('<div class="delivery-radio-btn">');

                            $hoursInput.appendTo($hoursBlockItem);
                            $hoursLabel.appendTo($hoursBlockItem);
                            $hoursRadioBtn.appendTo($hoursBlockItem);
                            $hoursBlockItem.appendTo(_this.$hoursBlock);
                            $hoursInput.on('change', function(){
                                _this.updateDeliveryAttrs('delivery_hours', $(this).val());
                            });

                            if ($title === _this.deliveryAttributes.delivery_hours) {
                                $hoursInput.prop('checked', true);
                                currentHoursAvail = true;
                            }
                        });

                        if (!deliveryAvail){
                            this.$datesBlock.hide();
                            this.$errorField.text('Delivery is not available').show();
                            $('.step__footer__continue-btn').hide();
                            return;
                        }
                        if (showBlock) {
                            this.$hoursBlock.insertBefore($beforeElem);
                        }
                        if (!currentHoursAvail) {
                            $('[name="delivery-hours"]').first().prop('checked', true).trigger('change');
                        }
                    }
                }else {
                    $.each(regionHours, function (ind, hours) {
                        if (!hours) {
                            return;
                        }

                        deliveryAvail = true;
                        var $hoursBlockItem = $('<div class="delivery-hours-block-item"></div>');
                        var $hoursLabel = $('<label for="delivery-hours-' + ind + '"><span class="delivery-hours-title">' + deliveryHours[ind].title + '</span><span class="delivery-hours-info">' + deliveryHours[ind].content + '</span></label>');
                        var $hoursInput = $('<input type="radio" name="delivery-hours" id="delivery-hours-' + ind + '">').val(deliveryHours[ind].title);
                        var $hoursRadioBtn = $('<div class="delivery-radio-btn">');
                        $hoursInput.appendTo($hoursBlockItem);
                        $hoursLabel.appendTo($hoursBlockItem);
                        $hoursRadioBtn.appendTo($hoursBlockItem);
                        $hoursBlockItem.appendTo(_this.$hoursBlock);
                        $hoursInput.on('change', function () {
                            _this.updateDeliveryAttrs('delivery_hours', $(this).val());
                        });

                        if (deliveryHours[ind].title === _this.deliveryAttributes.delivery_hours) {
                            $hoursInput.prop('checked', true);
                            currentHoursAvail = true;
                        }
                    });
                    if (!deliveryAvail){
                        this.$datesBlock.hide();
                        this.$errorField.text('Delivery is not available').show();
                        $('.step__footer__continue-btn').hide();
                        return;
                    }
                    if (showBlock) {
                      //  this.$hoursBlock.insertBefore($beforeElem);
                        setTimeout(this.$hoursBlock.insertAfter($afterElem), 400);
                    }
                    if (!currentHoursAvail) {
                        $('[name="delivery-hours"]').first().prop('checked', true).trigger('change');
                    }
                }
            },

            updateDeliveryToBlock: function(){
                var _this = this;
                function updateBlockContent() {
                    var $shippingBlock = $('.content-box[data-shipping-methods] .content-box__row');
                    $('.section--shipping-method .section__title').text('Delivery To');
                    $shippingBlock.find('.radio__label__primary').text(_this.deliveryLocation.region);
                }
                $(document).on('page:change', function () {
                    updateBlockContent();
                });
                updateBlockContent();
            },

            initSubscriptionBlock: function(){
                var _this = this;
                var $subscriptionBlock = $('.subscription-block');
                var $frequencyBlock = $('.subscription-frequency');
                var $purchaseTypesInputs = $('input[name="purchase-type"]', $subscriptionBlock);
                var $frequencyInputs = $('input[name="subscription-frequency"]', $subscriptionBlock);
                var $beforeElem = $('.step__footer');

                $frequencyInputs.on('change', function(){
                    _this.updateDeliveryAttrs('frequency_weeks', $(this).val());
                });
                $purchaseTypesInputs.on('change', function(){
                    _this.updateDeliveryAttrs('cart_subscription', $(this).val());
                    var checked = (!localStorage.getItem('wm_c_a') || localStorage.getItem('wm_c_a') == 0) ? false : true;
                    if (_this.checkboxAgreementEnable && !checked) {
                        _this.changeCheckboxAgreement(checked);
                    }

                    if ($(this).val() === 'false'){
                        $frequencyInputs.filter('[value="false"]').prop('checked', true).trigger('change');
                        $frequencyBlock.slideUp(200);
                    }
                    else {
                        if (!$frequencyInputs.not('[value="false"]').filter(':checked').length){
                            $frequencyInputs.not('[value="false"]').first().prop('checked', true).trigger('change');
                        }
                        $frequencyBlock.slideDown(300);
                    }
                    _this.showShippingMethod();
                });
                $frequencyInputs.filter('[value="' + _this.deliveryAttributes.frequency_weeks + '"]').prop('checked', true);
                $purchaseTypesInputs.filter('[value="' + _this.deliveryAttributes.cart_subscription + '"]').prop('checked', true).trigger('change');
                $subscriptionBlock.show().insertBefore($beforeElem);
                $(document).on('page:change', function () {
                    $subscriptionBlock.show().insertBefore($('.step__footer'));
                });
            }

        });
        return new CheckoutDelivery();
    })();

    function getSpend() {
        var spend = 0;
        $('.reduction-code__text').each(function(){
            var text = $(this).text();
            if( text.indexOf("SPEND") > -1 ){
                spend += 1;
            }
        });

        if(spend > 0){
            $('.order-summary__section.order-summary__section--discount').hide();
        }else{
            $('.order-summary__section.order-summary__section--discount').show();
        }
    };
    getSpend();

    function checkSpecialMealsPack() {
        if(checkoutDeliveryGlobal.deliveryAttributes.hide_one_time_discount > 0){
            $('body').addClass('hide-special-metafield');
            $('.order-summary__section.order-summary__section--discount').hide();
            $('.section.section--reductions.hidden-on-desktop').hide();
            $('.subscription-block #purchase-type-2').prop('checked', true).attr('checked', 'checked');
            $('.subscription-block #purchase-type-1').parent().hide();
            $('.subscription-block #subscription-frequency-2').parent().hide();
            if(!checkoutDeliveryGlobal.deliveryAttributes.product_with_vendor_wm360){
                $('.total-line.total-line--shipping').hide();
            }else{
                $('.wm-360-info').show();
            }
        }
    }
    checkSpecialMealsPack();
});