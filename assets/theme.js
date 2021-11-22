window.slate = window.slate || {};
window.theme = window.theme || {};

/*================ Slate ================*/
/**
 * A11y Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help make your theme more accessible
 * to users with visual impairments.
 *
 *
 * @namespace a11y
 */

slate.a11y = {

  /**
   * For use when focus shifts to a container rather than a link
   * eg for In-page links, after scroll, focus shifts to content area so that
   * next `tab` is where user expects if focusing a link, just $link.focus();
   *
   * @param {JQuery} $element - The element to be acted upon
   */
  pageLinkFocus: function($element) {
    var focusClass = 'js-focus-hidden';

    $element.first()
        .attr('tabIndex', '-1')
        .focus()
        .addClass(focusClass)
        .one('blur', callback);

    function callback() {
      $element.first()
          .removeClass(focusClass)
          .removeAttr('tabindex');
    }
  },

  /**
   * If there's a hash in the url, focus the appropriate element
   */
  focusHash: function() {
    var hash = window.location.hash;

    // is there a hash in the url? is it an element on the page?
    if (hash && document.getElementById(hash.slice(1))) {
      this.pageLinkFocus($(hash));
    }
  },

  /**
   * When an in-page (url w/hash) link is clicked, focus the appropriate element
   */
  bindInPageLinks: function() {
    $('a[href*=#]').on('click', function(evt) {
      this.pageLinkFocus($(evt.currentTarget.hash));
    }.bind(this));
  },

  /**
   * Traps the focus in a particular container
   *
   * @param {object} options - Options to be used
   * @param {jQuery} options.$container - Container to trap focus within
   * @param {jQuery} options.$elementToFocus - Element to be focused when focus leaves container
   * @param {string} options.namespace - Namespace used for new focus event handler
   */
  trapFocus: function(options) {
    var eventName = options.namespace
        ? 'focusin.' + options.namespace
        : 'focusin';

    if (!options.$elementToFocus) {
      options.$elementToFocus = options.$container;
    }

    options.$container.attr('tabindex', '-1');
    options.$elementToFocus.focus();

    $(document).on(eventName, function(evt) {
      if (options.$container[0] !== evt.target && !options.$container.has(evt.target).length) {
        options.$container.focus();
      }
    });
  },

  /**
   * Removes the trap of focus in a particular container
   *
   * @param {object} options - Options to be used
   * @param {jQuery} options.$container - Container to trap focus within
   * @param {string} options.namespace - Namespace used for new focus event handler
   */
  removeTrapFocus: function(options) {
    var eventName = options.namespace
        ? 'focusin.' + options.namespace
        : 'focusin';

    if (options.$container && options.$container.length) {
      options.$container.removeAttr('tabindex');
    }

    $(document).off(eventName);
  }
};

/**
 * Cart Template Script
 * ------------------------------------------------------------------------------
 * A file that contains scripts highly couple code to the Cart template.
 *
 * @namespace cart
 */

slate.cart = {

  /**
   * Browser cookies are required to use the cart. This function checks if
   * cookies are enabled in the browser.
   */
  cookiesEnabled: function() {
    var cookieEnabled = navigator.cookieEnabled;

    if (!cookieEnabled){
      document.cookie = 'testcookie';
      cookieEnabled = (document.cookie.indexOf('testcookie') !== -1);
    }
    return cookieEnabled;
  },

  cartChangeQTY: function(){
    $('.cart-item-count .product-add').click(function (e) { // function add 1 product
      e.preventDefault();
      let qty = $(this).prev('.product-count').text()*1 + 1,
          line_number = $(this).parent().data('line');
      postChange(qty, line_number);
    });

    $('.cart-item-count .product-remove').click(function (e) { // function remove 1 product
      e.preventDefault();
      let first_qty = $(this).next('.product-count').text()*1,
          line_number = $(this).parent().data('line'),
          qty;
      first_qty > 1 ? qty = first_qty-1 : qty = 0;
      postChange(qty, line_number);
    });

    function postChange(qty, line_number){
      $.post( "/cart/change.js", { quantity: qty, line: line_number }, function( data ) {
        changeCartContent(data);
        if(qty<1){
          document.location.href = '/cart';
        }
      }, "json");
    }

    function changeCartContent(data) {
      let item_count = data.item_count,
          total = data.total_price / 100,
          items = data.items;

      $('.header-cart-item-count').text(item_count);
      $('.title-sum').text('$'+total);
      checkCart(total);

      for(let i = 0; items.length>i; i++){
        changeLineItem(items[i]);
      }
    }

    function changeLineItem(item) {
      let line_item = $('.cart-main').find('.item-'+item.variant_id);
      line_item.find('.cart-item-count').attr('data-qty', item.quantity);
      line_item.find('.product-count').text(item.quantity);
      line_item.find('.item-total').text('$'+item.line_price/100);
    }

    function checkCart(total) {
      if(total < 60  && total > 1 ){
        $('.template-cart').addClass('active-pop-up');
        $('.cart-pop-up-min-sum').removeClass('hide');
        $('.cart-total-min').removeClass('hide');
        $('input[name="checkout"]').addClass('hide');
      }else {
        $('input[name="checkout"]').removeClass('hide');
        $('.cart-total-min').addClass('hide');
      }
    }

  },

  cartClear: function(){
    $('a.clear-cart').click(function (e) { // function remove all products
      $.ajax({
        method: "POST",
        url: "/cart/clear.js",
        success: function () {
          document.location.href = '/cart';
        },
        error: function (xhr){
          console.log(xhr.responseText);
          document.location.href = '/cart';
        }
      });
      e.preventDefault();
    });
  },

  cartIconCount: function(){
    $.getJSON('/cart.js', function (cart) {
      if( cart.item_count > 0 ){
        $('.header-cart-item-count').removeClass('hide').text(cart.item_count);
      }else{
        $('.header-cart-item-count').addClass('hide')
      }
      if ($('.progress-bar_container').length > 0 && $('body').hasClass('template-collection') && $('body').attr('id') == 'menu') {
        slate.cart.collectionProgressBar(cart);
      }
    });
  },

  collectionProgressBar: function(cart) {
    //console.log('collectionProgressBar', cart);
    let $container = $('.progress-bar_container');
    let $lineBar = $container.find('.progress-bar_line');
    let $lineBarText = $container.find('.progress-bar_text');
    let $discountText = $container.find('.discount-message');
    let $barCartTotal = $container.find('.progress-bar_total');
    let $barCartTotalMobile = $container.find('.progress-bar_total-mobile');
    let minCartValue = window.theme.minOrderSum * 100;

    /*console.log($barCartTotalMobile);
    console.log(slate.Currency.formatMoney(cart.total_price, theme.moneyFormat));*/

    if (cart.total_price == 0) {
      $barCartTotal.html('');
      $barCartTotalMobile.html('');
    } else {
      $barCartTotal.html('Total: ' + slate.Currency.formatMoney(cart.total_price, theme.moneyFormat));
      (minCartValue != '' && minCartValue > cart.total_price) ? $barCartTotal.addClass('disabled') : $barCartTotal.removeClass('disabled');

      $barCartTotalMobile.html(slate.Currency.formatMoney(cart.total_price, theme.moneyFormat));
      (minCartValue != '' && minCartValue > cart.total_price) ? $barCartTotalMobile.addClass('disabled') : $barCartTotalMobile.removeClass('disabled');
    }

    let discount1 = 2.5;
    let count1 = 14;
    let count1_half = Math.floor(count1 / 2);
    let discount2 = 5;
    let count2 = 18;
    let discount3 = 7.5;
    let count3 = 24;
    let discount4 = 10;
    let count4 = 28;

    let items = cart.items;
    let prodCount = 0;
    $.each(items, function(index, cartItem) {
      if (cartItem.properties != null && cartItem.properties['_shop_from'] != undefined && cartItem.properties['_shop_from'] == 'menu') {
        prodCount = prodCount + cartItem.quantity;
      }
    });

    let progBarWidth = 0;
    let progBarCount = 5;
    let progBarOne = 100 / progBarCount;
    let textActiveCount = 0;
    let discountValue = discount1;
    let discountValueText = discount1;
    let n = 0;
    let discountMoreText = "meals";
    let diff = count1_half;
    let step = progBarOne / diff;

    if (prodCount >= count4) {
      progBarWidth = 100;
      discountValue = discount4;
      textActiveCount = 4;
    } else if (prodCount >= count3) {
      progBarWidth = 80;
      discountValue = discount3;
      discountValueText = discount4;
      textActiveCount = 3;
    } else if (prodCount >= count2) {
      progBarWidth = 60;
      discountValue = discount2;
      discountValueText = discount3;
      textActiveCount = 2;
    } else if (prodCount >= count1) {
      progBarWidth = 40;
      discountValueText = discount2;
      textActiveCount = 1;
    } else if (prodCount >= count1_half) {
      progBarWidth = 20;
    }

    if (prodCount < count1_half) {
      n = count1_half - prodCount;
    } else if (prodCount < count1) {
      diff = count1 - count1_half;
      step = progBarOne / diff;
      n = count1 - prodCount;
    } else if (prodCount < count2) {
      diff = count2 - count1;
      step = progBarOne / diff;
      n = count2 - prodCount;
    } else if (prodCount < count3) {
      diff = count3 - count2;
      step = progBarOne / diff;
      n = count3 - prodCount;
    } else if (prodCount < count4) {
      diff = count4 - count3;
      step = progBarOne / diff;
      n = count4 - prodCount;
    }

    let width = (diff - n) * step + progBarWidth;
    //console.log(diff, n, step, progBarWidth, ' = ', width);

    $lineBar.css('width', (prodCount >= count4 ? 100 : width) + '%').attr('aria-valuenow', prodCount);

    if (n > count1_half) {
      discountMoreText = "meals";
    } else if (n >= 2) {
      discountMoreText = "more meals";
    } else {
      discountMoreText = "more meal";
    }

    //console.log('prodCount', prodCount, 'n', n, discountMoreText, discountValue, discountValueText);
    if (prodCount < count4) {
      $discountText.html("Purchase " + (prodCount < count1_half ? count1 + ' meals' : n + " " + discountMoreText) + " to <span>Save " + discountValueText + "%</span>");
    } else {
      $discountText.html("You <span>Saved " + discount4 + "%</span>");
    }

    let textL = $lineBarText.length;
    for (let i = 0; i < textL; i++) {
      if (textActiveCount > i) {
        $lineBarText.eq(i).addClass('active');
      } else {
        $lineBarText.eq(i).removeClass('active');
      }
    }
  },

  cartCheckTotal: function(){
    $.getJSON('/cart.js', function (cart) {
      checkCart(cart.total_price);
    });

    function checkCart(total) {

      if(total/100 < 60  && total> 1 ){
        $('.template-cart').addClass('active-pop-up');
        $('.cart-pop-up-min-sum').removeClass('hide');
        $('.cart-total-min').removeClass('hide');
        $('input[name="checkout"]').addClass('hide');
      }else {
        $('input[name="checkout"]').removeClass('hide');
        $('.cart-total-min').addClass('hide');
      }
    }

    $('.cart-pop-up-min-sum .btn-icon-close, .cart-pop-up-min-sum  .btn-agree').click( function(){
      hideCartPopUp();
    });

    function hideCartPopUp() {
      $('.template-cart').removeClass('active-pop-up');
      $('.cart-pop-up-min-sum').addClass('hide');
    }
  },

  /**
   * Delivery block on cart page
   * */
  cartDelivery: function(data) {
    var arr_week = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        arr_monthes = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        all_regions = [],
        all_delivery_places = [];

    mainDelivery(data);

    function copySorted(arr) {
      return arr.slice().sort();
    }

    function setAtributeCart() {
      var delivery_day = $('input[name="delivery-date"]:checked').val(),
          delivery_hours = $('input[name="delivery-hours"]:checked').val(),
          frequency_weeks = $('input[name="frequency-weeks"]:checked').val()*1,
          cart_subscription = $('input[name="type-purchase"]:checked').val()*1,
          subscription,
          frequency;
      cart_subscription > 0 ? subscription = true : subscription = false;
      cart_subscription > 0 ? frequency = frequency_weeks : frequency = false;

      $.post('/cart/update.js', {
        attributes:{
          'delivery_day': delivery_day,
          'delivery_hours': delivery_hours,
          'cart_subscription': subscription,
          'frequency_weeks': frequency,
        }
      });
    }

    function setAttributeCartDetails(delivery_details) {
      var delivery_day = $('input[name="delivery-date"]:checked').val(),
          delivery_hours = $('input[name="delivery-hours"]:checked').val(),
          cart_subscription = $('input[name="type-purchase"]:checked').val()*1,
          frequency_weeks = $('input[name="frequency-weeks"]:checked').val()*1,
          subscription,
          frequency;
      if(cart_subscription > 0){
        subscription = true;
        frequency = frequency_weeks;
      }else{
        subscription = false;
        frequency = false;
      }

      $.post("/cart/update.js", {
        attributes:{
          "delivery_day": delivery_day,
          "delivery_hours": delivery_hours,
          "delivery_location": delivery_details,
          "delivery_details": delivery_details,
          "cart_subscription": subscription,
          "frequency_weeks": frequency,
        }
      });
    }

    function mainDelivery(all_info) {
      var general_info = all_info.general,
          regions = all_info.regions,
          kitchen_time_zone = general_info.time,
          general_delivery_hours = general_info.hours,
          cutoff_time = general_info.cutoff_time;

      for(var i=0; regions.length>i; i++){
        var name_region = regions[i]['name'];
        all_regions.push(name_region);
      }
      for (var i=0; i<regions.length; i++){
        var places_arr = regions[i]['places'];
        for(var j =0; j<places_arr.length; j++){
          all_delivery_places.push(places_arr[j]);
        }
      }
      searchPlaces(all_delivery_places, regions, kitchen_time_zone, general_delivery_hours, cutoff_time);
    }

    $('input[name="delivery-date"]').change(function () {
      setAtributeCart();
    });

    function searchPlaces(data, regions, kitchen_time_zone, general_delivery_hours, cutoff_time){
      $('#searchFormCart').on('input', function () {
        var str = $(this).val();

        if( str.length > 2 ){
          var input_val = $(this).val().toLowerCase();
          if(data.length != undefined && data.length>0){
            $(".searchBlock").html('');
            var count_li = 0;
            for(var i = 0; data.length>i; i++){
              var content =  removeСomma(data[i]);
              if(content.toLowerCase().indexOf(input_val) != -1){
                var li_val = removeСomma(data[i]);
                $('.searchBlock').append('<li class="delivery_place" data-place="'+data[i]+'"><span></span>'+li_val+'</li>');
                count_li++;
              }
            }
            if(count_li>0){
              $('.searchBlock').css('display', 'block');
              $('.delivery-search .delivery-header').removeClass('empty').text("Choose your delivery region before you proceed to checkout!");
              $('.delivery-cart .searchForm').removeClass('empty');
            }else{
              $('.searchBlock').css('display', 'none');
              $('.delivery-search .delivery-header').addClass('empty').text("Sorry, it seems we don't delivery to you yet.");
              $('input[name="checkout"]').attr({'disabled': true}).val('Order not valid').css({'background-color':'transparent'});
              $('.cart-footer-buttons .message-choose').removeClass('hide');
              $('.delivery-cart .searchForm').addClass('empty');
            }
          }
        }else{
          $('.delivery-date-wrapper').addClass('hide');
          $('.searchBlock').css('display', 'none');
          $('.delivery-search h2').text("Get food you want.");
          $('input[name="checkout"]').attr({'disabled': true}).val('Order not valid').css({'background-color':'transparent'});
          $('.cart-footer-buttons .message-choose').removeClass('hide');
          $('.delivery-cart h3').addClass('empty');
          $('.delivery-cart .searchForm').addClass('empty');
        }
        showBlocPlaces(regions, kitchen_time_zone, general_delivery_hours, cutoff_time);
      });
    }

    function removeСomma(first_str){
      var change_str = first_str.replace(/,/ig, '');
      return change_str;
    }

    function showBlocPlaces(regions, kitchen_time_zone, general_delivery_hours, cutoff_time){
      $('.searchBlock > li').on('click',function(){
        $('.delivery-cart h3').removeClass('empty');
        $('.delivery-cart .searchForm').removeClass('empty');
        let text = $(this).text();
        $('#searchFormCart').val(text);

        var delivery_details = $(this).data('place');

        $('input[name="delivery-date"]').change(function () {
          setAttributeCartDetails(delivery_details);
          console.log('input[name=delivery-date]');
          console.log('delivery_details = ', delivery_details)
        });

        searchRegion(delivery_details, regions, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time);

        $('.searchBlock').css('display', 'none');
        $('.delivery-search h2').text('Yes, we deliver to '+text+' !');
        $('input[name="checkout"]').attr({'disabled': false}).val('Check Out').css({'background-color':'#fbb03b'});
        $('.cart-footer-buttons .message-choose').addClass('hide');
      });
    }

    function localSetInfo(delivery_details, regions, kitchen_time_zone, general_delivery_hours, cutoff_time){
      localStorage.setItem('delivery_details', delivery_details);
      localStorage.setItem('region', region);
      localStorage.setItem('kitchen_time_zone', kitchen_time_zone);
      localStorage.setItem('general_delivery_hours', general_delivery_hours);
      localStorage.setItem('cutoff_time', cutoff_time);
    }

    function localGetInfo() {
      //  console.log('local ', localStorage.getItem('general_delivery_hours'));
      let delivery_details = localStorage.getItem('delivery_details'),
          regions = localStorage.getItem('regions'),
          kitchen_time_zone = localStorage.getItem('kitchen_time_zone'),
          general_delivery_hours = localStorage.getItem('general_delivery_hours'),
          cutoff_time = localStorage.getItem('cutoff_time');
      showDayBlocks(region, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time);
    };
    // localGetInfo();

    function searchRegion(region_key, regions, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time){
      for (let i=0; i<regions.length; i++){
        if(regions[i]['places'].indexOf(region_key) != -1){
          var region = regions[i];
          showDayBlocks(region, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time);
          //localSetInfo(delivery_details, region, kitchen_time_zone, general_delivery_hours, cutoff_time);
        }
      }
    }

    function showDayBlocks(region, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time){
      var b_day = new Date(),
          booking_day = getKitchenTime(b_day, kitchen_time_zone);
      booking_day = checkCutoffTime(booking_day, cutoff_time);

      var booking_day_number = booking_day.getDay(),
          days = region['days'],
          delivery_hours = region['hours'];
      days = copySorted(days);
      $('.cart__submit-controls p').addClass('hide');

      showHoursBlocks(region, delivery_hours, general_delivery_hours, delivery_details);
      getDayCutoff(booking_day, days, booking_day_number, kitchen_time_zone);
      setAttributeCartDetails(delivery_details);
    }

    function checkCutoffTime(booking_day, cutoff_time){
      //  var change_time = 24 - cutoff_time[0];
      if(booking_day.getHours()*1 === cutoff_time[0]*1){
        if(booking_day.getMinutes()*1 === cutoff_time[1]*1){
          if(booking_day.getSeconds()*1 > cutoff_time[2]*1){
            // booking_day = new Date(booking_day.getTime() + change_time*60*60*1000);
            booking_day = createNewBookingDay(booking_day);
            return booking_day;
          }else{
            console.log('sec<');
          }
        }else if(booking_day.getMinutes()*1 > cutoff_time[1]*1){
          //booking_day = new Date(booking_day.getTime() + change_time*60*60*1000);
          booking_day = createNewBookingDay(booking_day);
          return booking_day;
        }else{
          return booking_day;
        }
        //booking_day = new Date(booking_day.getTime() + change_time*60*60*1000);
        //booking_day = createNewBookingDay(booking_day);
      }else if(booking_day.getHours()*1 > cutoff_time[0]*1){
        //booking_day = new Date(booking_day.getTime() + change_time*60*60*1000);
        booking_day = createNewBookingDay(booking_day);
        return booking_day;
      }else{
        return booking_day;
      }
    }

    function createNewBookingDay(booking_day) {
      let new_booking_day = new Date(booking_day.getTime() + 1*24*60*60*1000),
          booking_hours = new_booking_day.getHours()*1,
          booking_minutes = new_booking_day.getMinutes()*1 - 1;

      if(booking_hours > 0 ){
        new_booking_day = new Date(new_booking_day.getTime() - booking_hours*60*60*1000);
      }
      if(booking_minutes > 0 ){
        new_booking_day = new Date(new_booking_day.getTime() - booking_minutes*60*1000);
      }
      return new_booking_day
    }

    function showHoursBlocks(region, delivery_hours, general_delivery_hours, delivery_datails){
      createHoursLi(region, delivery_hours, general_delivery_hours, delivery_datails);
      $('.business-hours').removeClass('hide');
    }

    function createHoursLi(region, delivery_hours, general_delivery_hours, delivery_datails){
      $('.business-hours li').remove();
      for (var h =0; delivery_hours.length>h; h++){
        if(delivery_hours[h]){
          var val_title = general_delivery_hours[h].title;
          var val_content = general_delivery_hours[h].content;
          $('.cart--available-delivery-hours').append('<li>' +
              '<label class="radio-hours">' +
              '<input type="radio" id="delivery-hours-'+h+'" class="delivery-hours left" checked="checked" name="delivery-hours" value="'+val_title+'">' +
              '<div class="radio__text"><p>'+val_title+'</p><p>'+val_content+'</p></div>' +
              '</label></li>');
        }
      }
      $('input[name="delivery-hours"]:checked').parent().parent().addClass('active');

      $('input[name="delivery-hours"]').change(function () {
        $('.cart--available-delivery-hours li').removeClass('active');
        setAtributeCart(delivery_datails);
        $(this).parent().parent().addClass('active');
      });
    }

    function getDayCutoff(booking_day, days, booking_day_number, kitchen_time_zone) {
      for (var y = 0; arr_week.length > y; y++) {
        var resCheckCutoff = checkCutoff(booking_day_number, days);
        var str = '0, 1, 2, 3, 4, 5, 6';
        if (str.indexOf(resCheckCutoff) == -1) {
          booking_day_number += 1;
          if (booking_day_number > 6) {
            booking_day_number = 0;
          }
          checkCutoff(booking_day_number, days);
        } else {
          var next_cutoff_day = checkCutoff(booking_day_number, days);
          getAllCutoffs(next_cutoff_day, kitchen_time_zone, days);
          break;
        }
      }
    }

    function checkCutoff(booking_day_number, days){
      for (var d = 0; d<days.length; d++){
        if((booking_day_number*1) == (days[d][0]*1)){
          var next_cutoff_day = days[d][0];
          return next_cutoff_day;
        }
      }
    }

    function getAllCutoffs(next_cutoff_day, kitchen_time_zone, days){
      var arr_cutoff = [],
          arr_delivery = [];

      for(var k =0; k<days.length; k++){
        arr_cutoff.push(days[k][0]);
        arr_delivery.push(days[k][1]);
      }

      var day_1_key = arr_cutoff.indexOf(next_cutoff_day),
          day_2_key,
          day_3_key;
      (day_1_key + 1) < days.length ? ( day_2_key = day_1_key + 1) : ( day_2_key = 0);
      (day_2_key + 1) < days.length ? ( day_3_key = day_2_key + 1) : ( day_3_key = 0);

      var booking_day = new Date(),
          booking_day_number = booking_day.getDay();

      var cutoff_change = getCutoffData(booking_day_number, next_cutoff_day),
          first_delivery_change = getDaliveryData(next_cutoff_day, arr_delivery[day_1_key]),
          second_delivery_change = getDaliveryData(arr_delivery[day_1_key], arr_delivery[day_2_key]),
          third_delivery_change = getDaliveryData(arr_delivery[day_2_key], arr_delivery[day_3_key]);

      var first_delivery_day = new Date(first_delivery_change + cutoff_change + Date.now()),
          second_delivery_day = new Date(second_delivery_change + first_delivery_change + cutoff_change + Date.now()),
          third_delivery_day = new Date(third_delivery_change +second_delivery_change + first_delivery_change + cutoff_change + Date.now());

      createValueDays(first_delivery_day, second_delivery_day, third_delivery_day);
    }

    function createValueDays(first_delivery_day, second_delivery_day, third_delivery_day) {
      var val_block_1 = arr_week[first_delivery_day.getDay()] +' '+ first_delivery_day.getDate() +' '+ arr_monthes[first_delivery_day.getMonth()];
      var val_block_2 = arr_week[second_delivery_day.getDay()] +' '+ second_delivery_day.getDate() +' '+ arr_monthes[second_delivery_day.getMonth()];
      var val_block_3 = arr_week[third_delivery_day.getDay()] +' '+ third_delivery_day.getDate() +' '+ arr_monthes[third_delivery_day.getMonth()];
      daysValue(val_block_1, val_block_2, val_block_3);
    }

    function getDaliveryData(previous_day, next_day){
      var change;
      (+previous_day >= +next_day) ?
          ( change = 7 +  next_day - previous_day ) :
          ( change = next_day - previous_day );
      return change*24*60*60*1000;
    }

    function getCutoffData(previous_day, next_day){
      var change;
      (+previous_day > +next_day) ?
          ( change = 7 +  next_day - previous_day ) :
          ( change = next_day - previous_day );
      return change*24*60*60*1000;
    }

    function daysValue(val_block_1, val_block_2, val_block_3) {
      $('#delivery-date-0').val(val_block_1).next('label').html(val_block_1);
      $('#delivery-date-1').val(val_block_2).next('label').html(val_block_2);
      $('#delivery-date-2').val(val_block_3).next('label').html(val_block_3);
      $('.delivery-date-wrapper').removeClass('hide');
    }

    $('input[name="type-purchase"]').click(function () {
      var cart_subscription = $('input[name="type-purchase"]:checked').val()*1,
          frequency_weeks = $('input[name="frequency-weeks"]:checked').val()*1,
          subscription,
          frequency;
      //console.log('cart_subscription = '+cart_subscription);

      if(cart_subscription>0){
        $('.frequency-weeks-button').removeClass('hide');
      }else {
        $('.frequency-weeks-button').addClass('hide');
      }

      cart_subscription > 0 ? frequency = frequency_weeks : frequency = false;
      cart_subscription > 0 ? subscription = true : subscription = false;

      $.post('/cart/update.js', {
        attributes : {
          'cart_subscription': subscription,
          'frequency_weeks' : frequency,
        }
      });

    });

    $('input[name="frequency-weeks"]').click(function () {
      var frequency_weeks = $('input[name="frequency-weeks"]:checked').val()*1;
      $.post('/cart/update.js', {
        attributes : {
          'frequency_weeks': frequency_weeks,
        }
      });
    });

    function getKitchenTime(client_day, kitchen_time_zone){
      var client_time_zone = new Date().getTimezoneOffset()*(-1);
      var time_zone = 0;
      if(+kitchen_time_zone > +client_time_zone){
        time_zone = kitchen_time_zone - client_time_zone;
      }
      var kitchen_day = new Date(time_zone*60*1000+ Date.now());
      return kitchen_day;
    }

    $('.cart--available-delivery-days li').click(function () {
      $('.cart--available-delivery-days li').removeClass('active');
      $(this).addClass('active');
    });




    $('input[name="checkout"]').click(function (e) {
      e.preventDefault();
      let cart_subscription = $('input[name="type-purchase"]:checked').val()*1;

      if(cart_subscription>0){
        $.getJSON('/cart.js', function (cart) {
          for(var i=0; cart.items.length>0; i++){
            let it_propert = cart.items[i].properties['_subscription'];
            if(it_propert) {
              document.location.href = "/checkout"
            }else{
              cart.items[0].properties['_subscription'] = true;
              let pr_cart = cart.items[0].properties,
                  item_id = cart.items[0].id,
                  item_qty = cart.items[0].quantity;
              updateC(pr_cart, item_id, item_qty);
            }
          }

        });

      }else{
        $.getJSON('/cart.js', function (cart) {
          for(var i=0; cart.items.length>0; i++){
            if(cart.items[i].properties['_subscription']){
              cart.items[i].properties['_subscription'] = 'false';

              let pr_cart = cart.items[i].properties,
                  pr_id = cart.items[i].variant_id,
                  pr_qty = cart.items[i].quantity;

              localStorage.setItem('pr_id', pr_id);
              localStorage.setItem('pr_qty', pr_qty);

              updateCId(pr_cart, pr_id, pr_qty);
            }
            else{
              document.location.href = "/checkout";
            }
          }
        });
      }
    });

    function updateCId(pr_cart, id, qty) {

      $.ajax({
        type: 'post',
        url: '/cart/update.js',
        data: "updates["+id+"]=0",
        success: function(d){
          let product_id = localStorage.getItem('pr_id'),
              product_qty = localStorage.getItem('pr_qty'),
              product_obj = {
                id: product_id,
                quantity: product_qty
              };

          $.ajax({
            type: 'post',
            url: '/cart/add.js',
            data: product_obj,
            success: function(d){
              console.log(d);
              console.log('add');
              document.location.href = "/checkout";
            },
            dataType: 'json'
          });
        },
        dataType: 'json',
        error: function (d) {
          console.log(d.responseText);
        }
      });

    }

    function updateC(pr_cart, id, qty){
      $.post('/cart/change.js', {
        line: 1,
        quantity: qty,
        properties: {
          '_subscription': true
        }
      });
      document.location.href = "/checkout";
    }

  },

  /**
   * Cart Drawer
   * */

  setDeliverylocalStorage: function(obj_delivery_info){
    let location = obj_delivery_info.delivery_location,
        day = obj_delivery_info.delivery_day,
        time = obj_delivery_info.delivery_hours,
        purchase = obj_delivery_info.cart_subscription,
        frequency = obj_delivery_info.frequency_weeks,
        subscription_value_radio = obj_delivery_info.subscription_value_radio,
        date = new Date(Date.now() + 60*60*1000).getTime();

    localStorage.setItem('wm_d_l', location);
    localStorage.setItem('wm_d_l_t', date);
    localStorage.setItem('wm_d_d', day);
    localStorage.setItem('wm_d_t', time);
    localStorage.setItem('wm_d_p', purchase);
    localStorage.setItem('wm_d_p_c', subscription_value_radio);
    localStorage.setItem('wm_d_f', frequency);
  },

  openDrawer: function(){
  let body = $('body');
  if(!body.hasClass('template-cart')){
    $('.drawer').toggleClass('js-drawer-open-right');
    $('body').toggleClass('js-drawer-open').addClass('active-pop-up');
  }

  if( $('body').hasClass('single-product')){
    $('.product-form-wrapper').addClass('hidden');
  }
}

};

/**
 * Utility helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions for dealing with arrays and objects
 *
 * @namespace utils
 */

slate.utils = {

  /**
   * Return an object from an array of objects that matches the provided key and value
   *
   * @param {array} array - Array of objects
   * @param {string} key - Key to match the value against
   * @param {string} value - Value to get match of
   */
  findInstance: function(array, key, value) {
    for (var i = 0; i < array.length; i++) {
      if (array[i][key] === value) {
        return array[i];
      }
    }
  },

  /**
   * Remove an object from an array of objects by matching the provided key and value
   *
   * @param {array} array - Array of objects
   * @param {string} key - Key to match the value against
   * @param {string} value - Value to get match of
   */
  removeInstance: function(array, key, value) {
    var i = array.length;
    while(i--) {
      if (array[i][key] === value) {
        array.splice(i, 1);
        break;
      }
    }

    return array;
  },

  /**
   * _.compact from lodash
   * Remove empty/false items from array
   * Source: https://github.com/lodash/lodash/blob/master/compact.js
   *
   * @param {array} array
   */
  compact: function(array) {
    var index = -1;
    var length = array == null ? 0 : array.length;
    var resIndex = 0;
    var result = [];

    while (++index < length) {
      var value = array[index];
      if (value) {
        result[resIndex++] = value;
      }
    }
    return result;
  },

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
  defaultTo: function(value, defaultValue) {
    return (value == null || value !== value) ? defaultValue : value
  }
};

/**
 * Rich Text Editor
 * -----------------------------------------------------------------------------
 * Wrap iframes and tables in div tags to force responsive/scrollable layout.
 *
 * @namespace rte
 */

slate.rte = {
  /**
   * Wrap tables in a container div to make them scrollable when needed
   *
   * @param {object} options - Options to be used
   * @param {jquery} options.$tables - jquery object(s) of the table(s) to wrap
   * @param {string} options.tableWrapperClass - table wrapper class name
   */
  wrapTable: function(options) {
    var tableWrapperClass = typeof options.tableWrapperClass === "undefined" ? '' : options.tableWrapperClass;

    options.$tables.wrap('<div class="' + tableWrapperClass + '"></div>');
  },

  /**
   * Wrap iframes in a container div to make them responsive
   *
   * @param {object} options - Options to be used
   * @param {jquery} options.$iframes - jquery object(s) of the iframe(s) to wrap
   * @param {string} options.iframeWrapperClass - class name used on the wrapping div
   */
  wrapIframe: function(options) {
    var iframeWrapperClass = typeof options.iframeWrapperClass === "undefined" ? '' : options.iframeWrapperClass;

    options.$iframes.each(function() {
      // Add wrapper to make video responsive
      $(this).wrap('<div class="' + iframeWrapperClass + '"></div>');

      // Re-set the src attribute on each iframe after page load
      // for Chrome's "incorrect iFrame content on 'back'" bug.
      // https://code.google.com/p/chromium/issues/detail?id=395791
      // Need to specifically target video and admin bar
      this.src = this.src;
    });
  }
};

slate.Sections = function Sections() {
  this.constructors = {};
  this.instances = [];

  $(document)
      .on('shopify:section:load', this._onSectionLoad.bind(this))
      .on('shopify:section:unload', this._onSectionUnload.bind(this))
      .on('shopify:section:select', this._onSelect.bind(this))
      .on('shopify:section:deselect', this._onDeselect.bind(this))
      .on('shopify:section:reorder', this._onReorder.bind(this))
      .on('shopify:block:select', this._onBlockSelect.bind(this))
      .on('shopify:block:deselect', this._onBlockDeselect.bind(this));
};

slate.Sections.prototype = $.extend({}, slate.Sections.prototype, {
  _createInstance: function(container, constructor) {
    var $container = $(container);
    var id = $container.attr('data-section-id');
    var type = $container.attr('data-section-type');

    constructor = constructor || this.constructors[type];

    if (typeof constructor === 'undefined') {
      return;
    }

    var instance = $.extend(new constructor(container), {
      id: id,
      type: type,
      container: container
    });

    this.instances.push(instance);
  },

  _onSectionLoad: function(evt) {
    var container = $('[data-section-id]', evt.target)[0];
    if (container) {
      this._createInstance(container);
    }
  },

  _onSectionUnload: function(evt) {
    var instance = slate.utils.findInstance(this.instances, 'id', evt.detail.sectionId);

    if (!instance) {
      return;
    }

    if (typeof instance.onUnload === 'function') {
      instance.onUnload(evt);
    }

    this.instances = slate.utils.removeInstance(this.instances, 'id', evt.detail.sectionId);
  },

  _onSelect: function(evt) {
    var instance = slate.utils.findInstance(this.instances, 'id', evt.detail.sectionId);

    if (instance && typeof instance.onSelect === 'function') {
      instance.onSelect(evt);
    }
  },

  _onDeselect: function(evt) {
    var instance = slate.utils.findInstance(this.instances, 'id', evt.detail.sectionId);

    if (instance && typeof instance.onDeselect === 'function') {
      instance.onDeselect(evt);
    }
  },

  _onReorder: function(evt) {
    var instance = slate.utils.findInstance(this.instances, 'id', evt.detail.sectionId);

    if (instance && typeof instance.onReorder === 'function') {
      instance.onReorder(evt);
    }
  },

  _onBlockSelect: function(evt) {
    var instance = slate.utils.findInstance(this.instances, 'id', evt.detail.sectionId);

    if (instance && typeof instance.onBlockSelect === 'function') {
      instance.onBlockSelect(evt);
    }
  },

  _onBlockDeselect: function(evt) {
    var instance = slate.utils.findInstance(this.instances, 'id', evt.detail.sectionId);

    if (instance && typeof instance.onBlockDeselect === 'function') {
      instance.onBlockDeselect(evt);
    }
  },

  register: function(type, constructor) {
    this.constructors[type] = constructor;

    $('[data-section-type=' + type + ']').each(function(index, container) {
      this._createInstance(container, constructor);
    }.bind(this));
  }
});

/**
 * Currency Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help with currency formatting
 *
 * Current contents
 * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
 *
 */

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

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = slate.utils.defaultTo(precision, 2);
      thousands = slate.utils.defaultTo(thousands, ',');
      decimal = slate.utils.defaultTo(decimal, '.');

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

/**
 * Image Helper Functions
 * -----------------------------------------------------------------------------
 * A collection of functions that help with basic image operations.
 *
 */

slate.Image = (function() {

  /**
   * Preloads an image in memory and uses the browsers cache to store it until needed.
   *
   * @param {Array} images - A list of image urls
   * @param {String} size - A shopify image size attribute
   */

  function preload(images, size) {
    if (typeof images === 'string') {
      images = [images];
    }

    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      this.loadImage(this.getSizedImageUrl(image, size));
    }
  }

  /**
   * Loads and caches an image in the browsers cache.
   * @param {string} path - An image url
   */
  function loadImage(path) {
    new Image().src = path;
  }

  /**
   * Find the Shopify image attribute size
   *
   * @param {string} src
   * @returns {null}
   */
  function imageSize(src) {
    var match = src.match(/.+_((?:pico|icon|thumb|small|compact|medium|large|grande)|\d{1,4}x\d{0,4}|x\d{1,4})[_\.@]/);

    if (match) {
      return match[1];
    } else {
      return null;
    }
  }

  /**
   * Adds a Shopify size attribute to a URL
   *
   * @param src
   * @param size
   * @returns {*}
   */
  function getSizedImageUrl(src, size) {
    if (size === null) {
      return src;
    }

    if (size === 'master') {
      return this.removeProtocol(src);
    }

    var match = src.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif)(\?v=\d+)?$/i);

    if (match) {
      var prefix = src.split(match[0]);
      var suffix = match[0];

      return this.removeProtocol(prefix[0] + '_' + size + suffix);
    } else {
      return null;
    }
  }

  function removeProtocol(path) {
    return path.replace(/http(s)?:/, '');
  }

  return {
    preload: preload,
    loadImage: loadImage,
    imageSize: imageSize,
    getSizedImageUrl: getSizedImageUrl,
    removeProtocol: removeProtocol
  };
})();

/**
 * Variant Selection scripts
 * ------------------------------------------------------------------------------
 *
 * Handles change events from the variant inputs in any `cart/add` forms that may
 * exist. Also updates the master select and triggers updates when the variants
 * price or image changes.
 *
 * @namespace variants
 */

slate.Variants = (function() {

  /**
   * Variant constructor
   *
   * @param {object} options - Settings from `product.js`
   */
  function Variants(options) {
    this.$container = options.$container;
    this.product = options.product;
    this.singleOptionSelector = options.singleOptionSelector;
    this.originalSelectorId = options.originalSelectorId;
    this.enableHistoryState = options.enableHistoryState;
    this.currentVariant = this._getVariantFromOptions();

    $(this.singleOptionSelector, this.$container).on('change', this._onSelectChange.bind(this));
  }

  Variants.prototype = $.extend({}, Variants.prototype, {

    /**
     * Get the currently selected options from add-to-cart form. Works with all
     * form input elements.
     *
     * @return {array} options - Values of currently selected variants
     */
    _getCurrentOptions: function() {
      var currentOptions = $.map($(this.singleOptionSelector, this.$container), function(element) {
        var $element = $(element);
        var type = $element.attr('type');
        var currentOption = {};

        if (type === 'radio' || type === 'checkbox') {
          if ($element[0].checked) {
            currentOption.value = $element.val();
            currentOption.index = $element.data('index');

            return currentOption;
          } else {
            return false;
          }
        } else {
          currentOption.value = $element.val();
          currentOption.index = $element.data('index');

          return currentOption;
        }
      });

      // remove any unchecked input values if using radio buttons or checkboxes
      currentOptions = slate.utils.compact(currentOptions);

      return currentOptions;
    },

    /**
     * Find variant based on selected values.
     *
     * @param  {array} selectedValues - Values of variant inputs
     * @return {object || undefined} found - Variant object from product.variants
     */
    _getVariantFromOptions: function() {
      var selectedValues = this._getCurrentOptions();
      var variants = this.product.variants;
      var found = false;

      variants.forEach(function(variant) {
        var satisfied = true;

        selectedValues.forEach(function(option) {
          if (satisfied) {
            satisfied = (option.value === variant[option.index]);
          }
        });

        if (satisfied) {
          found = variant;
        }
      });

      return found || null;
    },

    /**
     * Event handler for when a variant input changes.
     */
    _onSelectChange: function() {
      var variant = this._getVariantFromOptions();

      this.$container.trigger({
        type: 'variantChange',
        variant: variant
      });

      if (!variant) {
        return;
      }

      this._updateMasterSelect(variant);
      this._updateImages(variant);
      this._updatePrice(variant);
      this.currentVariant = variant;

      if (this.enableHistoryState) {
        this._updateHistoryState(variant);
      }
    },

    /**
     * Trigger event when variant image changes
     *
     * @param  {object} variant - Currently selected variant
     * @return {event}  variantImageChange
     */
    _updateImages: function(variant) {
      var variantImage = variant.featured_image || {};
      var currentVariantImage = this.currentVariant.featured_image || {};

      if (!variant.featured_image || variantImage.src === currentVariantImage.src) {
        return;
      }

      this.$container.trigger({
        type: 'variantImageChange',
        variant: variant
      });
    },

    /**
     * Trigger event when variant price changes.
     *
     * @param  {object} variant - Currently selected variant
     * @return {event} variantPriceChange
     */
    _updatePrice: function(variant) {
      if (variant.price === this.currentVariant.price && variant.compare_at_price === this.currentVariant.compare_at_price) {
        return;
      }

      this.$container.trigger({
        type: 'variantPriceChange',
        variant: variant
      });
    },

    /**
     * Update history state for product deeplinking
     *
     * @param {object} variant - Currently selected variant
     */
    _updateHistoryState: function(variant) {
      if (!history.replaceState || !variant) {
        return;
      }

      var newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?variant=' + variant.id;
      window.history.replaceState({path: newurl}, '', newurl);
    },

    /**
     * Update hidden master select of variant change
     *
     * @param {object} variant - Currently selected variant
     */
    _updateMasterSelect: function(variant) {
      $(this.originalSelectorId, this.$container)[0].value = variant.id;
    }
  });

  return Variants;
})();

/**
 * Customer Subscriptions Templates Script
 * ------------------------------------------------------------------------------
 *
 * @namespace subscriptions
 */

slate.subscriptions = {

  singleSubscription: function (regions_info, key_kitchen) {
    function showSpinner() {
      $('.custom-spinner').removeClass('hide');
      $('body').addClass('active-pop-up');
    }

    function closeSpinner() {
      $('.custom-spinner').addClass('hide');
      $('body').removeClass('active-pop-up');
    }

    $(".pause-btn").on('click', function(){
      $('.subscriptions-pop-up').removeClass('hide');
      $('body').addClass('active-pop-up');
      findTimeBlocks();
    });

    function createTimeBlocks(chosen_delivery_day, region){
      $('.subscriptions-pop-up .delivery-hours-block').empty().append('<p class="subscriptions-block-title">Delivery Hours</p>');
       createPauseTimeBlock(chosen_delivery_day, region);
    }

    /* change  subscription address*/
    $(".btn-change-subscription-address").on('click', function(){
      $('.subscriptions-pop-up-address').removeClass('hide');
      $('body').addClass('active-pop-up');
      let all_regions = regions_info.regions;
      datePickerAddress(all_regions);
    });

    function datePickerAddress(regions){
      let region_key = $('#customer-subscription-info').data('customer-location'),
          customer_next_day = $('.change-day-delivery-block .next-delivery-day').val(),
          calendar_id = '#customer-delivery-date';

      if(region_key){
        for (let i=0; i<regions.length; i++){
          if(regions[i]['places'].indexOf(region_key) != -1){
            var region = regions[i];
          }
        }
        updateDeliveryHoursBlockPopUp (region);
        findNextDelivery(region, customer_next_day, calendar_id);
      }
    }

    $(".close-change").on('click', function () {
      $('.subscriptions-pop-up-address').addClass('hide');
      $('body').removeClass('active-pop-up');
    });

    $('.customer-addresses input').click(function () {
      $('.select-change-address').removeClass('hide');
    });

    $('.select-change-address li').click(function () {
      $('.select-change-address').addClass('hide');
      let block = $(this);
      $('.customer-addresses input').val(block.data('address'));
      $('.first-name').val(block.data('name'));
      $('.last-name').val(block.data('last-name'));
      $('.email').val(block.data('email'));
      $('.phone').val(block.data('phone'));
      $('.address').val(block.data('address'));
      $('.apartment').val(block.data('apartment'));

      //findDelivery(block.data('location'));
      $('.block-search-location input').val("").addClass('error');
      $('input.country').val("");
      $('input.territory').val("");
      $('input.city').val("");
      $('input.postcode').val("");
      $('.save-new-address').addClass("error").attr('disabled', true);
    });

    $(document).mouseup(function (e) {
      var container = $(".select-change-address");
      if (container.has(e.target).length === 0){
        container.addClass('hide');
      }
    });

    $('.phone').bind("change keyup input click", function() {
      if (this.value.match(/^\+[0-9]/g)) {
        this.value = this.value.replace(/[^\+0-9]/g, '');
      }
    });

    customerNewAddress(regions_info);

    function customerNewAddress(regions_info) {
      let general_info = regions_info.general,
          regions = regions_info.regions,
          kitchen_time_zone = general_info.time,
          general_delivery_hours = general_info.hours,
          cutoff_time = general_info.cutoff_time,
          all_regions_customer = [],
          all_delivery_places_customer = [];

      for (let i = 0; regions.length > i; i++) {
        all_regions_customer.push(regions[i]['name']);
      }
      for (let i = 0; i < regions.length; i++) {
        let places_arr = regions[i]['places'];
        for (let j = 0; j < places_arr.length; j++) {
          all_delivery_places_customer.push(places_arr[j]);
        }
      }
      searchPlaces(all_delivery_places_customer, regions, kitchen_time_zone, general_delivery_hours, cutoff_time);
    }

    function searchPlaces(data, regions, kitchen_time_zone, general_delivery_hours, cutoff_time){
      $('#customer-location-input').on('input', function () {
        if( $(this).val().length > 2 ){
          let val = removeСomma($(this).val()),
              input_val = val.toLowerCase();
          if(data.length != undefined && data.length>0){
            $(".customer-location-regions").html('');
            let count_li = 0;
            for(let i = 0; data.length>i; i++){
              let content =  removeСomma(data[i]);
              if(content.toLowerCase().indexOf(input_val) != -1){
                let li_val = removeСomma(data[i]);
                $('.customer-location-regions').append('<li class="delivery_place" data-place="'+data[i]+'"><span></span>'+li_val+'</li>');
                count_li++;
              }
            }
            if(count_li>0){
              $('.customer-location-regions').css('display', 'block');
              $('.block-search-location span').addClass('hide');
              $('.block-search-location input').removeClass('error');
            }else{
              $('.customer-location-regions').css('display', 'none');
              $('.block-search-location span').removeClass('hide');
              $('.block-search-location input').addClass('error');
              $('.save-new-address').addClass('error').attr('disabled', true);
            }
          }
        }else{
          $('.customer-location-regions').css('display', 'none');
          $('.block-search-location span').addClass('hide');
          $('.block-search-location input').addClass('error');
          $('.save-new-address').addClass('error').attr('disabled', true);
        }

        setNewDeliveryRegion(regions, kitchen_time_zone, general_delivery_hours, cutoff_time);
      });
    }

    function removeСomma(first_str){
      return first_str.replace(/,/ig, '')
    }

    function setNewDeliveryRegion(regions, kitchen_time_zone, general_delivery_hours, cutoff_time){
      $('.customer-location-regions > li').on('click',function(){
        let text = $(this).text(),
            delivery_details = $(this).data('place');

        $('#customer-location-input').val(text).data('region-attr', delivery_details);
        $('.customer-location-regions').css('display', 'none');
        $('.block-search-location input').removeClass('error');
        $('.save-new-address').removeClass('error').attr('disabled', false);
        $('.changed').removeClass('hide');
        $('#customer-subscription-info').data('customer-next-delivery', 0);

        parseDeliveryRegion(delivery_details);
        searchRegionCustomer(delivery_details, regions, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time);
      });
    }

    $('.personal input').on('input', function () {
      let count = 0;
      $('.personal input').each( function(){
        if( $(this).val() == "" || $(this).val() == " " || $(this).val() == "  " || $(this).val() == "   " || $(this).val() == "    "){
          count += 1;
          $(this).addClass('error');
        }else {
          $(this).removeClass('error');
        }
      });

      if (count > 0 ){
        $('.save-new-address').addClass('error').attr('disabled', true);
      }else{
        $('.save-new-address').removeClass('error').attr('disabled', false);
      }
    });

    function parseDeliveryRegion(delivery_region){
      let arr_regions = delivery_region.split(',');
      $('.block-change-delivery-address .country').val("Australia");
      $('.block-change-delivery-address .territory').val(arr_regions[1]);
      $('.block-change-delivery-address .city').val(arr_regions[0]);
      $('.block-change-delivery-address .postcode').val(arr_regions[2]);
    }

    function searchRegionCustomer(region_key, regions, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time){
      for (let i=0; i<regions.length; i++){
        if(regions[i]['places'].indexOf(region_key) != -1){
          var region = regions[i];
          showDayBlocks(region, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time);
        }
      }
    }

    function showDayBlocks(region, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time){
      var b_day = new Date(),
          booking_day_t_z = getKitchenTime(b_day, kitchen_time_zone);

      var booking_day = checkCutoffTime(booking_day_t_z, cutoff_time);

      var booking_day_number = booking_day.getDay(),
          days = region['days'],
          delivery_hours = region['hours'];
      days = copySorted(days);

      getDayCutoff(booking_day, days, booking_day_number, kitchen_time_zone, region);
    }

    function getKitchenTime(client_day, kitchen_time_zone){
      let client_time_zone = new Date().getTimezoneOffset()*(-1),
          time_zone = 0;
      if(+kitchen_time_zone > +client_time_zone){
        time_zone = kitchen_time_zone - client_time_zone;
      }
      return new Date(time_zone*60*1000+ Date.now())
    }

    function checkCutoffTime(booking_day, cutoff_time){
      if(booking_day.getHours()*1 === cutoff_time[0]*1){
        if(booking_day.getMinutes()*1 === cutoff_time[1]*1){
          if(booking_day.getSeconds()*1 > cutoff_time[2]*1){
            booking_day = createNewBookingDay(booking_day);
            return booking_day;
          }else{
            console.log('sec<');
          }
        }else if(booking_day.getMinutes()*1 > cutoff_time[1]*1){
          booking_day = createNewBookingDay(booking_day);
          return booking_day;
        }else{
          return booking_day;
        }
      }else if(booking_day.getHours()*1 > cutoff_time[0]*1){
        booking_day = createNewBookingDay(booking_day);
        return booking_day;
      }else{
        return booking_day;
      }
    }

    function createNewBookingDay(booking_day) {
      let new_booking_day = new Date(booking_day.getTime() + 24*60*60*1000),
          booking_hours = new_booking_day.getHours()*1,
          booking_minutes = new_booking_day.getMinutes()*1 - 1;

      if(booking_hours > 0 ){
        new_booking_day = new Date(new_booking_day.getTime() - booking_hours*60*60*1000);
      }
      if(booking_minutes > 0 ){
        new_booking_day = new Date(new_booking_day.getTime() - booking_minutes*60*1000);
      }
      return new_booking_day;
    }

    function getDayCutoff(booking_day, days, booking_day_number, kitchen_time_zone, region) {
      for (let y = 0; arr_week.length > y; y++) {
        let resCheckCutoff = checkCutoff(booking_day_number, days),
            str = '0, 1, 2, 3, 4, 5, 6';
        if (str.indexOf(resCheckCutoff) == -1) {
          booking_day_number += 1;
          if (booking_day_number > 6) {
            booking_day_number = 0;
          }
          checkCutoff(booking_day_number, days);
        } else {
          var next_cutoff_day = checkCutoff(booking_day_number, days);
          getAllCutoffs(next_cutoff_day, kitchen_time_zone, days, region);
          break;
        }
      }
    }

    function checkCutoff(booking_day_number, days){
      for (let d = 0; d<days.length; d++){
        if((booking_day_number*1) == (days[d][0]*1)){
          return days[d][0];
        }
      }
    }

    function getAllCutoffs(next_cutoff_day, kitchen_time_zone, days, region){
      let arr_cutoff = [],
          arr_delivery = [];
      for(let k =0; k<days.length; k++){
        arr_cutoff.push(days[k][0]);
        arr_delivery.push(days[k][1]);
      }
      let day_1_key = arr_cutoff.indexOf(next_cutoff_day);

      let booking_day = new Date(),
          booking_day_number = booking_day.getDay(),
          calendar_id = "#customer-delivery-date";

      let cutoff_change = getCutoffData(booking_day_number, next_cutoff_day),
          first_delivery_change = getDeliveryData(next_cutoff_day, arr_delivery[day_1_key]),
          first_delivery_day = new Date(first_delivery_change + cutoff_change + Date.now()),
          text_month = first_delivery_day.getMonth(),
          text_day =first_delivery_day.getDate();

      if(text_month < 10){
        text_month = '0'+text_month;
      }
      if(text_day < 10){
        text_day = '0'+text_day;
      }

      let text_delivery_day = first_delivery_day.getFullYear()+'-'+text_month+'-'+text_day;

      $('#customer-subscription-info').data('delivery-day', 0);

      $('#customer-delivery-date').val(text_delivery_day);

      findNextDelivery(region, first_delivery_day, calendar_id);
      customerDeliveryHoursBlock(region);
    }

    function customerDeliveryHoursBlock (region){
      var deliveryHours = regions_info.general.hours,
          regionHours = region.hours,
          currentHours = $('#customer-subscription-info').data('delivery-hours');

      $('.block-change-delivery-day .delivery-time ul').empty();

      $.each(regionHours, function(ind, hours){
        if (!hours) {
          return;
        }

        var $hoursBlockItem = $('.block-change-delivery-day .delivery-time ul');
        var $hoursLabel = $('<li><label for="delivery-hours-' + ind + '"></label></li>');
        var $hoursInput = $('<input type="radio" name="delivery-hours" id="address-delivery-hours-' + ind + '">').val(deliveryHours[ind].title);
        var $textInput = $('<div class="radio__text"><span class="delivery-hours-title">' + deliveryHours[ind].title
            + '</span><span class="delivery-hours-info">' + deliveryHours[ind].content + '</span></div>');

        $hoursInput.appendTo($hoursLabel);
        $textInput.appendTo($hoursLabel);
        $hoursBlockItem.append($hoursLabel);

        if (deliveryHours[ind].title === currentHours) {
          $hoursInput.prop('checked', true);
        }
      });

      $('.block-change-delivery-day [name="delivery-hours"]').first().prop('checked', true).trigger('change');
    }

    function getCutoffData(previous_day, next_day){
      let change;
      (+previous_day > +next_day) ?
          ( change = 7 +  next_day - previous_day ) :
          ( change = next_day - previous_day );
      return change*24*60*60*1000;
    }

    function getDeliveryData(previous_day, next_day){
      let change;
      (+previous_day >= +next_day) ?
          ( change = 7 +  next_day - previous_day ) :
          ( change = next_day - previous_day );
      return change*24*60*60*1000;
    }

    $(".save-new-address").on("click", function () {
      showSpinner();
      let block = $(this).parent().parent(),
          subscription = $('#customer-subscription-info').data('subscription-id'),
          customer = $('#customer-subscription-info').data('customer-id'),
          addresses = [],
          new_address = {};

      new_address['first_name'] = $.trim(block.find('input.first-name').val());
      new_address['last_name'] = $.trim(block.find('input.last-name').val());
      new_address['phone'] = $.trim(block.find('input.phone').val());
      new_address['email'] = $.trim(block.find('input.email').val());
      new_address['address1'] = $.trim(block.find('input.address').val());
      new_address['address2'] = $.trim(block.find('input.apartment').val());
      new_address['country'] = "Australia";
      new_address['country_code'] = "AU";
      new_address['country_name'] = "Australia";
      new_address['name'] = $.trim(block.find('input.first-name').val()+' '+block.find('input.last-name').val());
      new_address['province_code'] = $.trim(block.find('input.territory').val());
      new_address['zip'] = $.trim(block.find('input.postcode').val());
      new_address['city'] = $.trim(block.find('input.city').val());

      if(block.find('.default-address-checkbox input').is(':checked')){
        new_address['default'] = true;
      }else{
        new_address['default'] = false;
      }

      if( block.find('input.territory').val().indexOf("NSW") > -1){
        new_address['province'] = "New South Wales";
      }

      addresses.push(new_address);

      checkNewAddress(customer, addresses, subscription, new_address);
    });

    $('.subscriptions-pop-up-address').on('click', function () {
      $('.create-error').addClass('hide').text('');
    });

    function checkNewAddress(customer, addresses, subscription, new_address){
      $.ajax({
        url: '/apps/'+ key_kitchen +'/updateSubscriptionCustomerAddresses',
        dataType: 'json',
        type: 'POST',
        data: {
          customerApiId: customer,
          addresses: addresses,
        },
        success: function (response) {
          console.log(response);
          if(!response.success){
            $('.create-error').removeClass('hide').text('Error! '+response.message+'!');
            $('.custom-spinner').addClass('hide');
          }else{
            saveNewAddressSecond(customer, subscription, new_address);
          }
        },
        error: function (e) {
          console.log(e);
          $('.create-error').removeClass('hide').text('Error! Please, try again!');
          $('.custom-spinner').addClass('hide');
        }
      });
    }

    function saveNewAddressSecond(customer, subscription, new_address) {
      let customer_location = $('#customer-location-input').data('region-attr',),
          arr_location = customer_location.split(', '),
          delivery_date = $('#customer-delivery-date').val(),
          delivery_hours =$('.block-change-delivery-day [name="delivery-hours"]:checked').val();

      new_address['location'] = $.trim(customer_location);
      new_address['region'] = $.trim(arr_location[3]);

      $.ajax({
        url: '/apps/'+ key_kitchen +'/updateSubscription',
        dataType: 'json',
        type: 'POST',
        data: {
          subscriptionId: subscription,
          customerApiId: customer,
          deliveryHours: delivery_hours,
          location: customer_location,
          shippingAddress: new_address,
          deliveryDate: delivery_date,
        },
        success: function (response) {
          console.log(response);
          if( response.success){
            console.log('response.success');
            $('.create-error').removeClass('hide').text('Error! '+response.message+'!');
            $('.custom-spinner').addClass('hide');
          }else{
            location.reload();
          }
        },
        error: function (e) {
          console.log(e);
          $('.create-error').removeClass('hide').text('Error! Please, try again!');
          $('.custom-spinner').addClass('hide');
        }
      });

    }

    $('.delivery-hours-block-static').on('click', 'li', function(){
      let element = $(this),
          input = element.find('input'),
          input_value = input.val();

      $('.delivery-hours-block-static input').prop('checked', false).trigger('change').removeClass('active');
      $(input).prop('checked', true).trigger('change').addClass('active');
      $('#customer-subscription-info').attr('data-delivery-hours', input_value);
    });

    $('.subscriptions-pop-up-address .subscriptions-available-delivery-hours').on('click', 'li', function(){
      let element = $(this),
          input = element.find('input'),
          input_value = input.val();

      $('.subscriptions-pop-up-address .subscriptions-available-delivery-hours input').prop('checked', false).trigger('change');
      $(input).prop('checked', true).trigger('change');
      $('#customer-subscription-info').data('delivery-hours', input_value);
    });

    blockSubscriptionDetails(regions_info.regions);

    function blockSubscriptionDetails(regions){
      let region_key = $('#customer-subscription-info').data('customer-location'),
          customer_next_day = $('.change-day-delivery-block .next-delivery-day').val(),
          calendar_id = '.change-day-delivery-block .next-delivery-day';

      if(region_key){
        for (let i=0; i<regions.length; i++){
          if(regions[i]['places'].indexOf(region_key) != -1){
            var region = regions[i];
          }
        }
        findNextDelivery(region, customer_next_day, calendar_id);
      }
    }

    function saveOrderNote(data){
      $.ajax({
        url: '/apps/'+ key_kitchen +'/updateSubscription',
        dataType: 'json',
        type: 'POST',
        data: data,
        success: function (response) {
          console.log(response);
          location.reload();
        },
        error: function (e) {
          console.log(e);
          closeSpinner();
        }
      });
    }

    $(".btn-update-day-note").on('click', function(){
      let subscription_id = $('#customer-subscription-info').data('subscription-id'),
          customer_id = $('#customer-subscription-info').data('customer-id'),
          subs_day = $('.change-day-delivery-block .next-delivery-day').val(),
          delivery_hours = $('.change-day-delivery-block [name="delivery-hours"]:checked').val(),
          note = $('.change-day-delivery-block .change-order-notes').val(),
          data = {
            subscriptionId: subscription_id,
            customerApiId: customer_id,
            deliveryDate: subs_day,
            deliveryHours: delivery_hours,
            note: note,
          };
      showSpinner();
      saveOrderNote(data);
    });

    $('.meal-pack-short-info__text button').click(function () {
      let button = $(this),
          pack_content = button.parent().parent().parent().parent().next('.meal-pack-row-content');
      button.toggleClass('active');
      pack_content.toggleClass('hide');
    });

    function showCancelPopUp(data){
      $('.radio-reason:first-child input[name="type-reason"]').attr('checked', true).prop('checked');

      $('body').addClass('active-pop-up');
      $('.subscriptions-pop-up-canceled').removeClass('hide');

      showTextarea();

      $('input[name="type-reason"]').change(()=>showTextarea());

      let button = $('.hold-btn.change-status-btn');

      $('.subscriptions-pop-up-canceled .close').click(function () {
        saveCanceled(data, button);
      });

      $('.subscriptions-pop-up-canceled .disregard').click(function () {
        $('body').removeClass('active-pop-up');
        $('.subscriptions-pop-up-canceled').addClass('hide');
      });
    }

    function showTextarea(){
      let reason = $('input[name="type-reason"]:checked'),
          reason_comment = reason.parent().data('customer-note'),
          reason_comment_required = reason.parent().data('customer-note-required');

      if(reason_comment){
        $('.cancel-reason-comment').removeClass('hide');
        if(reason_comment_required){
          $('.cancel-reason-comment').attr('required', true).addClass('required');
        }else{
          $('.cancel-reason-comment').attr('required', false).removeClass('error required');
        }
      }else{
        $('.cancel-reason-comment').addClass('hide').attr('required', false).removeClass('error required');
      }
    }

    $('.cancel-reason-comment').on('input', function() {
      let value = $(this).val();
      value = value.replace(/[^A-Za-z0-9_\.\,\s]/gi, '');
      $(this).val(value);
    });

    function saveCanceled(data, button){
      let reason = $('input[name="type-reason"]:checked'),
          reason_id = reason.val(),
          reason_comment = reason.parent().data('customer-note'),
          comment = '';

      if(reason_comment){
        comment = $('.cancel-reason-comment').val();
      }

      if(comment == '' && $('.cancel-reason-comment').hasClass('required')){
        $('.cancel-reason-comment').addClass('error');
      }else{
        $('.cancel-reason-comment').removeClass('error');
        showSpinner();

        data['cancelReasonId'] = reason_id;
        data['cancelReasonComment'] = comment;

        $('.subscriptions-pop-up-canceled').addClass('hide');
        $.ajax({
          url: '/apps/'+ key_kitchen +'/handleSubscriptionStatus',
          dataType: 'json',
          type: 'GET',
          data: data,
          success: function (response) {
            console.log(response);
            location.reload();
          },
          error: function (e) {
            console.log(e);
          }
        });
      }
    };

    $('.close-pop-up-icon').click(function () {
      console.log('close popup');
      $('.subscriptions-pop-up').addClass('hide');
      $('body').removeClass('active-pop-up');
      $('.subscriptions-pop-up-canceled').addClass('hide');
      $('.subscriptions-pop-up-address').addClass('hide');
    });

    $('.close-subscription-pop-up').click(function () {
      $('.subscriptions-pop-up').addClass('hide');
      $('body').removeClass('active-pop-up');
    });

    let all_regions = [],
        all_delivery_places = [],
        arr_week = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        arr_monthes = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    customerDelivery(regions_info);

    function copySorted(arr) {
      return arr.slice().sort();
    }

    function customerDelivery(all_info) {
      var regions = all_info.regions,
          region_key = $('#customer-subscription-info').data('customer-location');

      shortRegionData(region_key, regions);
    }

    function shortRegionData(region_key, regions){
      for (let i=0; i<regions.length; i++){
        if(regions[i]['places'].indexOf(region_key) != -1){
          var region = regions[i];
          eventSubsButton(region);
         // updateDeliveryHoursBlock(region);
          updateDeliveryHoursBlockStatic (region);
        }
      }
    }

    function findTimeBlocks(){
      let region_key = $('#customer-subscription-info').data('customer-location');
      let regions = regions_info.regions;
      if(region_key){
        for (let i=0; i<regions.length; i++){
          if(regions[i]['places'].indexOf(region_key) != -1){
            var region = regions[i];
          }
        }
      }

      var next_day = new Date($('.subscriptions-pop-up .subscription-details #account_deliveryDate').val()).getDay();
      createTimeBlocks(next_day, region);
      $('.subscriptions-pop-up .subscription-details #account_deliveryDate').on('change', function(){
        var next_day = new Date($('.subscriptions-pop-up .subscription-details #account_deliveryDate').val()).getDay();
        createTimeBlocks(next_day, region);
      });
    }

    function updateDeliveryHoursBlockStatic (region){
      if(region.regionDeliverySettings){
          var chosen_delivery_day = new Date($('.change-day-delivery-block input.next-delivery-day').val()).getDay();
          createStaticTimeBlock(chosen_delivery_day, region);
          $('.change-day-delivery-block input.next-delivery-day').on('change', function(){
              var chosen_delivery_day = new Date($('.change-day-delivery-block input.next-delivery-day').val()).getDay();
              createStaticTimeBlock(chosen_delivery_day, region);
          });
      }else{
          var deliveryHours = regions_info.general.hours,
              regionHours = region.hours,
              currentHours = $('#customer-subscription-info').data('delivery-hours');

          $('.block-change-delivery-day .delivery-time ul').empty();
          $.each(regionHours, function(ind, hours){
              if (!hours) {
                  return;
              }
              var $hoursBlockItem = $('.change-day-delivery-block .delivery-hours-block-static');
              var $hoursLabel = $('<li><label for="delivery-hours-' + ind + '"></label></li>');
              var $hoursInput = $('<input type="radio" name="delivery-hours" id="address-delivery-hours-' + ind + '">').val(deliveryHours[ind].title);
              var $textInput = $('<div class="radio__text"><span class="delivery-hours-title">' + deliveryHours[ind].title
                  + '</span><span class="delivery-hours-info">' + deliveryHours[ind].content + '</span></div>');

              $hoursInput.appendTo($hoursLabel);
              $textInput.appendTo($hoursLabel);
              $hoursBlockItem.append($hoursLabel);

              if (deliveryHours[ind].title === currentHours) {
                  $hoursInput.addClass('active').prop('checked', true).trigger('change');
              }
          });

          if (!currentHours) {
              $('[name="delivery-hours"]').first().prop('checked', true).trigger('change');
          }
      }

    }

    function createStaticTimeBlock(chosen_delivery_day, region) {
        $('.change-day-delivery-block .delivery-hours-block-static').empty();
        let delivery_day_type = $('#customer-subscription-info').data('day-same');
        let variants_delivery = region.regionDeliverySettings;
        let delivery_obj_hours;
        let currentHours = $('#customer-subscription-info').data('delivery-hours');
        for(var i = 0; variants_delivery.length > i; i++){
          if(delivery_day_type && variants_delivery[i].sddAllowed){
            var this_delivery = variants_delivery[i].delivery*1;
            if( this_delivery*1 == chosen_delivery_day){
              delivery_obj_hours =  variants_delivery[i].deliveryHours;
            }
          }else if(!delivery_day_type && variants_delivery[i].allowed){
            var this_delivery = variants_delivery[i].delivery*1;
            if( this_delivery*1 == chosen_delivery_day){
              delivery_obj_hours =  variants_delivery[i].deliveryHours;
            }
          }
        }
        $.each(delivery_obj_hours, function(ind, hour_block){
            if(delivery_day_type){
              var hour_block_title = hour_block.sddTitle;
              var hour_block_helpText = hour_block.sddHelpText;
            }else{
              var hour_block_title = hour_block.title;
              var hour_block_helpText = hour_block.helpText;
            }
            var $hoursBlockItem = $('.change-day-delivery-block .delivery-hours-block-static');
            var $hoursLabel = $('<li><label for="delivery-hours-' + ind + '"></label></li>');
            var $hoursInput = $('<input type="radio" name="delivery-hours" id="address-delivery-hours-' + ind + '">').val(hour_block_title);
            var $textInput = $('<div class="radio__text"><span class="delivery-hours-title">' + hour_block_title
                + '</span><span class="delivery-hours-info">' + hour_block_helpText + '</span></div>');

            $hoursInput.appendTo($hoursLabel);
            $textInput.appendTo($hoursLabel);
            $hoursBlockItem.append($hoursLabel);

            if (hour_block_title === currentHours) {
                $hoursInput.addClass('active').prop('checked', true).trigger('change');
            }
        });

        if (!currentHours) {
            $('[name="delivery-hours"]').first().prop('checked', true).trigger('change');
        }
    }

    function updateDeliveryHoursBlockPopUp (region){
      $('.subscriptions-change-address .subscriptions-available-delivery-hours').empty();
        if(region.regionDeliverySettings){
            var chosen_delivery_day = new Date($('.subscriptions-pop-up-address #customer-delivery-date').val()).getDay();
            createAddressTimeBlock(chosen_delivery_day, region);
            $('.subscriptions-pop-up-address #customer-delivery-date').on('change', function(){
                var chosen_delivery_day = new Date($('.subscriptions-pop-up-address #customer-delivery-date').val()).getDay();
                createAddressTimeBlock(chosen_delivery_day, region);
            });
        }else {
            var deliveryHours = regions_info.general.hours,
                regionHours = region.hours,
                currentHours = $('#customer-subscription-info').attr('data-delivery-hours');

            $.each(regionHours, function (ind, hours) {
                if (!hours) {
                    return;
                }

                var $hoursBlockItem = $('.subscriptions-change-address .subscriptions-available-delivery-hours');
                var $hoursLabel = $('<li><label for="delivery-hours-' + ind + '"></label></li>');
                var $hoursInput = $('<input type="radio" name="delivery-hours" id="address-delivery-hours-' + ind + '">').val(deliveryHours[ind].title);
                var $textInput = $('<div class="radio__text"><span class="delivery-hours-title">' + deliveryHours[ind].title
                    + '</span><span class="delivery-hours-info">' + deliveryHours[ind].content + '</span></div>');

                $hoursInput.appendTo($hoursLabel);
                $textInput.appendTo($hoursLabel);
                $hoursBlockItem.append($hoursLabel);

                if (deliveryHours[ind].title === currentHours) {
                    $hoursInput.prop('checked', true).addClass('active');
                }
            });

            if (!currentHours) {
                $('[name="delivery-hours"]').first().prop('checked', true).trigger('change');
            }
        }
    }

    function createAddressTimeBlock(chosen_delivery_day, region){
        $('.subscriptions-change-address .subscriptions-available-delivery-hours').empty();
        let delivery_day_type = $('#customer-subscription-info').data('day-same');
        let variants_delivery = region.regionDeliverySettings;
        let delivery_obj_hours;
        let currentHours = $('#customer-subscription-info').data('delivery-hours');
        for(var i = 0; variants_delivery.length > i; i++){
          if(delivery_day_type && variants_delivery[i].sddAllowed){
            var this_delivery = variants_delivery[i].delivery*1;
            if( this_delivery*1 == chosen_delivery_day){
              delivery_obj_hours =  variants_delivery[i].deliveryHours;
            }
          }else if(!delivery_day_type && variants_delivery[i].allowed){
            var this_delivery = variants_delivery[i].delivery*1;
            if( this_delivery*1 == chosen_delivery_day){
              delivery_obj_hours =  variants_delivery[i].deliveryHours;
            }
          }
        }
        $.each(delivery_obj_hours, function(ind, hour_block){
            if (!hour_block) {
                return;
            }
          if(delivery_day_type){
            var hour_block_title = hour_block.sddTitle;
            var hour_block_helpText = hour_block.sddHelpText;
          }else{
            var hour_block_title = hour_block.title;
            var hour_block_helpText = hour_block.helpText;
          }
            var $hoursBlockItem = $('.subscriptions-change-address .subscriptions-available-delivery-hours');
            var $hoursLabel = $('<li><label for="delivery-hours-' + ind + '"></label></li>');
            var $hoursInput = $('<input type="radio" name="delivery-hours" id="address-delivery-hours-' + ind + '">').val(hour_block_title);
            var $textInput = $('<div class="radio__text"><span class="delivery-hours-title">' + hour_block_title
                + '</span><span class="delivery-hours-info">' + hour_block_helpText + '</span></div>');

            $hoursInput.appendTo($hoursLabel);
            $textInput.appendTo($hoursLabel);
            $hoursBlockItem.append($hoursLabel);

            if (hour_block_title === currentHours) {
                $hoursInput.prop('checked', true).addClass('active');
            }
        })

        if (!currentHours) {
            $('[name="delivery-hours"]').first().prop('checked', true).trigger('change');
        }
    }

    function eventSubsButton(region){
      $(".change-status-btn").on('click', function(){
        $('.pop-up-error').addClass('hide');
        var button = $(this),
            status = button.data('status'),
            block_main_info = $('#customer-subscription-info'),
            subscription_id = block_main_info.data('subscription-id'),
            customer_id = block_main_info.data('customer-id'),
            customer_next_day = block_main_info.data('customer-next-delivery'),
            calendar_id = "#account_deliveryDate",
            data = {
              subscriptionId: subscription_id,
              customerApiId: customer_id,
              subscriptionStatus: status,
            };

        if(status == "ACTIVE"){
          $('.subscriptions-pop-up').removeClass('hide');
          $('body').addClass('active-pop-up');
          // findDayBlocks(region, kitchen_time_zone, general_delivery_hours, region_key, cutoff_time);
          findNextDelivery(region, customer_next_day, calendar_id);
        }else if(status == "CANCELLED"){
          showCancelPopUp(data);
        }else {
          showSpinner();
          $.ajax({
            url: '/apps/'+ key_kitchen +'/handleSubscriptionStatus',
            dataType: 'json',
            type: 'GET',
            data: data,
            success: function (response) {
              console.log(response);
              location.reload();
            },
            error: function (e) {
              console.log(e);
            }
          });
        }
      });
    }

    function findNextDelivery(region, customer_next_day, calendar_id){
      let //days = region['days'],
          arr_cutoff = [],
          arr_delivery = [],
          delivery_day_type = $('#customer-subscription-info').data('day-same');
      for(let i = 0; region.regionDeliverySettings.length> i; i++){
      /*  if(delivery_day_type){
          if(region.regionDeliverySettings[i].sddAllowed){
            arr_cutoff.push(region.regionDeliverySettings[i].delivery*1 - 1);
            arr_delivery.push(region.regionDeliverySettings[i].delivery);
          }
        }else{*/
          if(region.regionDeliverySettings[i].allowed){
            arr_cutoff.push(region.regionDeliverySettings[i].cutoff);
            arr_delivery.push(region.regionDeliverySettings[i].delivery);
          }
      //  }
      }

      /*for(let k =0; k<days.length; k++){
        arr_cutoff.push(days[k][0]);
        arr_delivery.push(days[k][1]);
      }*/

      createData(arr_delivery, customer_next_day, arr_cutoff, calendar_id);
    }

    function createData(arr_delivery, delivery_day, arr_cutoff, calendar_id) {
      let first_delivery_day = new Date(delivery_day),
          default_date = first_delivery_day,
          default_min_day = $('#customer-subscription-info').data('customer-next-delivery'),
          min_day,
          current_next_delivery_day = $('#customer-subscription-info').data('delivery-day');
      if (current_next_delivery_day > 0) {
        let date_parts = current_next_delivery_day.split('-');
        default_date = new Date(+date_parts[0], +date_parts[1] - 1, +date_parts[2]);
      }

      if (default_min_day){
        let min_parse = default_min_day.split('-');
        min_day = new Date(+min_parse[0], +min_parse[1] - 1, +min_parse[2]);
      }else{
        min_day = default_date;
      }

      $( calendar_id ).datepicker( "destroy" );

      createDatePicker(calendar_id, min_day, default_date, arr_delivery, first_delivery_day , arr_cutoff);
      // getNewPaymentDay(arr_delivery, default_date, arr_cutoff);
    }

    function createDatePicker(calendar_id, min_day, default_date, arr_delivery, first_delivery_day , arr_cutoff) {
      $( calendar_id ).datepicker({
        dateFormat: 'yy-mm-dd',
        minDate: min_day,
        maxDate: "+2m",
        defaultDate: default_date,
        beforeShowDay: function(date) {
          var day = date.getDay();
          var holidays = [
            [1,1],
            [2,1],
            [3,1],
            [4,1],
            [5,1],
            [29,12],
            [30,12],
            [31,12]
          ];
          //return [(day != 1 && day != 2)];
          for (var i = 0; i < holidays.length; i++) {
            if (holidays[i][0] == date.getDate() && holidays[i][1] - 1 == date.getMonth()) {
              return [false];
            }
          }
          if(arr_delivery.length == 1){
            return [(day == arr_delivery[0])];
          }else if(arr_delivery.length == 2){
            return [(day == arr_delivery[0] || day == arr_delivery[1])];
          }else if(arr_delivery.length == 3){
            return [(day == arr_delivery[0] || day == arr_delivery[1] || day == arr_delivery[2])];
          }else if(arr_delivery.length == 4){
            return [(day == arr_delivery[0] || day == arr_delivery[1] || day == arr_delivery[2] || day == arr_delivery[3])];
          }else if(arr_delivery.length == 5){
            return [(day == arr_delivery[0] || day == arr_delivery[1] || day == arr_delivery[2] || day == arr_delivery[3] || day == arr_delivery[4])];
          }else if(arr_delivery.length == 6){
            return [(day == arr_delivery[0] || day == arr_delivery[1] || day == arr_delivery[2] || day == arr_delivery[3] || day == arr_delivery[4] || day == arr_delivery[5])];
          }else if(arr_delivery.length == 7){
            return [(day == arr_delivery[0] || day == arr_delivery[1] || day == arr_delivery[2] || day == arr_delivery[3] || day == arr_delivery[4] || day == arr_delivery[5] || day == arr_delivery[6])];
          }

        }
      }).on("change",function(){
        let value = $(this).val(),
            first_delivery_day = new Date(value);
        getNewPaymentDay(arr_delivery, first_delivery_day, arr_cutoff);
      }).datepicker( "option", "showAnim", "slide" );

      $(window).resize(function(){
        $( calendar_id ).datepicker("hide");
      });
    }

    function getNewPaymentDay(arr_delivery, first_delivery_day, arr_cutoff) {
      let next_delivery = new Date(first_delivery_day);
      let delivery_day = next_delivery.getDay(),
          index = arr_delivery.indexOf(delivery_day),
          cutoff_day = arr_cutoff[index];

      if (cutoff_day*1 > delivery_day*1){
        delivery_day +=7;
      }
      let cutoff_change = (delivery_day-cutoff_day)* 24 * 60 * 60 * 1000,
          payment_day = $('#customer-subscription-info').data('days-before-cutoff') * 1,
          payment_change = payment_day * 24 * 60 * 60 * 1000;

      let payment_data = next_delivery.getTime() - cutoff_change - payment_change,
          payment_full = new Date(payment_data),
          payment_full_date = payment_full.getFullYear()+'-'+arr_monthes[payment_full.getMonth()]+'-'+payment_full.getDate();

      $('#account_paymentDate').text(payment_full_date);
      $('.next-payment-date').text(payment_full_date);

    }

    function createPauseTimeBlock(chosen_delivery_day, region){
      $('.subscriptions-pop-up .subscriptions-available-delivery-hours').empty();
      let delivery_day_type = $('#customer-subscription-info').data('day-same');
      let variants_delivery = region.regionDeliverySettings;
      let delivery_obj_hours;
      let currentHours = $('#customer-subscription-info').data('delivery-hours');
      for(var i = 0; variants_delivery.length > i; i++){
        if(delivery_day_type && variants_delivery[i].sddAllowed){
          var this_delivery = variants_delivery[i].delivery*1;
          if( this_delivery*1 == chosen_delivery_day){
            delivery_obj_hours =  variants_delivery[i].deliveryHours;
          }
        }else if(!delivery_day_type && variants_delivery[i].allowed){
          var this_delivery = variants_delivery[i].delivery*1;
          if( this_delivery*1 == chosen_delivery_day){
            delivery_obj_hours =  variants_delivery[i].deliveryHours;
          }
        }
      }
      $.each(delivery_obj_hours, function(ind, hour_block){
        if(delivery_day_type){
          var hour_block_title = hour_block.sddTitle;
          var hour_block_helpText = hour_block.sddHelpText;
        }else{
          var hour_block_title = hour_block.title;
          var hour_block_helpText = hour_block.helpText;
        }
        var checked = '';
        var class_input = '';
        if (hour_block_title == currentHours) {
          checked = 'checked';
          class_input = 'class="active"';
        }

        var $hoursBlockItem = $('.subscriptions-pop-up .subscriptions-available-delivery-hours');
        var $hoursLabel = $('<li><label class="radio-hours here-here" for="delivery-hours-' + ind + '"><input type="radio" name="delivery-hours" id="delivery-hours-' + ind + '" value="'+hour_block_title+'"'+class_input + checked+'>' +
            '<div class="radio__text"><span class="delivery-hours-title">' + hour_block_title
            + '</span><span class="delivery-hours-info">' + hour_block_helpText + '</span></div></label></li>');
        $hoursBlockItem.append($hoursLabel);

      });

      if (!currentHours) {
        $('[name="delivery-hours"]').first().prop('checked', true).trigger('change');
      }
    }

    $('.activate-subs-btn').click(function () {
      //  showSpinner();
      //  $('.subscriptions-pop-up').addClass('hide');
      let subs_day = $('#account_deliveryDate').val(),
          block_main_info = $('#customer-subscription-info'),
          subscription_id = block_main_info.data('subscription-id'),
          customer_id = block_main_info.data('customer-id'),
          delivery_hours = $('[name="delivery-hours"]:checked').val(),
          data = {
            subscriptionId: subscription_id,
            customerApiId: customer_id,
            deliveryDate: subs_day,
            deliveryHours: delivery_hours,
          };

      $('.subscriptions-pop-up .subscription-action-buttons').addClass('saved');
      $('.subscriptions-pop-up .subscription-action-buttons p').removeClass('hide').find('span').text(subs_day);
      $.ajax({
        url: '/apps/' + key_kitchen + '/updateSubscription',
        dataType: 'json',
        type: 'POST',
        data: data,
        success: function (response) {

          if (response.success !== false) {
            location.reload();
          } else {
            /*Show popup*/
            closeSpinner();
            let error_message = response.message + '! Please, try again.';
            $('.pop-up-error').removeClass('hide').text(error_message);
          }
        },
        error: function (e) {
          console.log(e);
        }
      });

    })

    function updateDeliveryHoursBlock (region) {
      if (region.regionDeliverySettings) {
        var chosen_delivery_day = new Date($('.subscriptions-pop-up #account_deliveryDate').val()).getDay();
        createPauseTimeBlock(chosen_delivery_day, region);
        $('.subscriptions-pop-up #account_deliveryDate').on('change', function () {
          var chosen_delivery_day = new Date($('.subscriptions-pop-up #account_deliveryDate').val()).getDay();
          createPauseTimeBlock(chosen_delivery_day, region);
        });
      } else {
        var _this = this;
        var deliveryHours = regions_info.general.hours;
        var regionHours = region.hours;
        var currentHours = $('#customer-subscription-info').data('delivery-hours');
        this.$hoursBlock = $('<div class="delivery-hours-block">');
        var $blockHeader = $('<p class="subscriptions-block-title">Delivery Hours</p>').appendTo(this.$hoursBlock);
        var $beforeElem = $('.subscriptions-pop-up .subscription-action-buttons');
        var currentHoursAvail = false;
        var deliveryAvail = false;

        $.each(regionHours, function(ind, hours){
          if (!hours) {
            return;
          }
          var $hoursBlockItem = $('.change-day-delivery-block .delivery-hours-block-static');
          var $hoursLabel = $('<li><label for="delivery-hours-' + ind + '"></label></li>');
          var $hoursInput = $('<input type="radio" name="delivery-hours" id="address-delivery-hours-' + ind + '">').val(deliveryHours[ind].title);
          var $textInput = $('<div class="radio__text"><span class="delivery-hours-title">' + deliveryHours[ind].title
              + '</span><span class="delivery-hours-info">' + deliveryHours[ind].content + '</span></div>');

          $hoursInput.appendTo($hoursLabel);
          $textInput.appendTo($hoursLabel);
          $hoursBlockItem.append($hoursLabel);

          if (deliveryHours[ind].title === currentHours) {
            $hoursInput.addClass('active').prop('checked', true).trigger('change');
          }
        });

        if (!deliveryAvail) {
          this.$errorField.text('Delivery is not available').show();
          return;
        }
        this.$hoursBlock.insertBefore($beforeElem);
        if (!currentHoursAvail) {
          $('[name="delivery-hours"]').first().prop('checked', true).trigger('change');
        }
      }

      $('.activate-subs-btn').click(function () {
        //  showSpinner();
        //  $('.subscriptions-pop-up').addClass('hide');
        let subs_day = $('#account_deliveryDate').val(),
            block_main_info = $('#customer-subscription-info'),
            subscription_id = block_main_info.data('subscription-id'),
            customer_id = block_main_info.data('customer-id'),
            delivery_hours = $('[name="delivery-hours"]:checked').val(),
            data = {
              subscriptionId: subscription_id,
              customerApiId: customer_id,
              deliveryDate: subs_day,
              deliveryHours: delivery_hours,
            };

        $('.subscriptions-pop-up .subscription-action-buttons').addClass('saved');
        $('.subscriptions-pop-up .subscription-action-buttons p').removeClass('hide').find('span').text(subs_day);
        $.ajax({
          url: '/apps/' + key_kitchen + '/updateSubscription',
          dataType: 'json',
          type: 'POST',
          data: data,
          success: function (response) {

            if (response.success !== false) {
              location.reload();
            } else {
              /*Show popup*/
              closeSpinner();
              let error_message = response.message + '! Please, try again.';
              $('.pop-up-error').removeClass('hide').text(error_message);
            }
          },
          error: function (e) {
            console.log(e);
          }
        });

      })
    }
  },

  changeMealsPage: function (products, key_kitchen) {

    function changeTotalSum() {
      let total_sum = 0;

      $('.change-meals-body-row').each(function () {
        if($(this).hasClass('product-to-remove')){
        }else{
          let product_sum = $(this).find('.subscription-product-total span').text()*1;
          total_sum = total_sum*1 +product_sum;
        }
      });

      $('tr.meal-pack-row-header').each(function () {
        if($(this).hasClass('product-to-remove')){
          $(this).next('meal-pack-row-content').addClass('hide');
        }else{
          let content_meal_pack = $(this).next('.meal-pack-row-content');

          content_meal_pack.find('.subscription-product-info').each(function () {
            let price = $(this).find(".subscription-product-price span").text()*1,
                qty = $(this).find(".subscription-product-count span").text()*1;
            total_sum = total_sum + price * qty;
          });
        }
      });

      $('.row-subscription-total span').text((total_sum).toFixed(2));
    }

    createProductsVariants(products);

    function sumRound(sum){
      return sum.toFixed(2);
    }

    let allergens_icons ={
          kc_al_gluten : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-wheat" viewBox="0 0 18 25"><path fill="#868686" d="M14.955.066a.49.49 0 0 1 .18.67l-.583 1.01c.282.352.415.863.38 1.488-.041.741-.316 1.587-.775 2.381-.252.437-.54.826-.844 1.154.341-.085.673-.129.985-.129.594 0 1.075.165 1.393.47l1.22-.644a.493.493 0 0 1 .459.87l-1.27.67c.06.972-.816 2.172-2.289 3.023a6.56 6.56 0 0 1-.887.43 1 1 0 0 1 .177.14l1.219-.644a.49.49 0 1 1 .458.869l-1.267.67c.026.413-.119.875-.429 1.35-.405.62-1.067 1.215-1.861 1.674a7.07 7.07 0 0 1-.684.345.514.514 0 0 1 .068.057l1.22-.643a.49.49 0 1 1 .459.868l-1.27.671c.026.414-.119.875-.428 1.35-.406.62-1.067 1.215-1.862 1.674-.783.452-1.601.721-2.33.77l-.24.01c-.763 0-1.34-.272-1.624-.764a1.34 1.34 0 0 1-.15-.391l-2.547 4.388a.68.68 0 0 1-.427.305.675.675 0 0 1-.508-.081.68.68 0 0 1-.224-.935l2.486-4.156-.125.006c-1.189 0-2.084-1.566-2.084-3.641 0-1.7.601-3.059 1.472-3.494l-.054-1.434a.492.492 0 0 1 .983-.038l.052 1.377.085.027a6.412 6.412 0 0 1-.043-.76c0-1.703.602-3.061 1.473-3.496l-.054-1.432a.49.49 0 1 1 .982-.037l.052 1.376c.071.02.14.046.209.078a6.488 6.488 0 0 1-.07-.976c0-1.702.601-3.061 1.472-3.495l-.054-1.434a.491.491 0 1 1 .982-.037l.053 1.377c.662.191 1.199.89 1.486 1.88a6.26 6.26 0 0 1 .57-1.302c.762-1.319 1.834-2.195 2.775-2.284l.156-.007c.076 0 .15.005.221.016l.585-1.01a.491.491 0 0 1 .671-.18zM9.212 16.432c-.608 0-1.366.237-2.08.649-1.405.811-1.976 1.893-1.752 2.283.089.15.315.246.633.267l.142.005c.607 0 1.364-.236 2.078-.648.654-.377 1.211-.874 1.53-1.361.25-.383.334-.728.222-.922-.1-.173-.382-.273-.773-.273zm-6.177-3.74c-.45 0-1.101 1.036-1.101 2.659 0 1.623.651 2.658 1.1 2.658.45 0 1.102-1.035 1.102-2.658-.001-1.623-.653-2.658-1.101-2.658zm3.844 2.47l-.853 1.468a6.72 6.72 0 0 1 1.299-.745 1.26 1.26 0 0 1-.3-.35 1.378 1.378 0 0 1-.146-.372zm-1.803-.571l.012.111a6.84 6.84 0 0 1 .02 1.028l.645-1.08a1.278 1.278 0 0 1-.677-.06zm6.63-2.48c-.608 0-1.364.236-2.078.648-.654.377-1.212.874-1.53 1.36-.251.384-.334.729-.222.923.088.151.314.246.632.268l.142.004c.608 0 1.365-.236 2.079-.647.653-.378 1.21-.873 1.53-1.361.25-.384.334-.729.222-.922-.101-.174-.383-.273-.774-.273zM5.53 8.37c-.448 0-1.1 1.035-1.1 2.658 0 1.624.652 2.659 1.1 2.659.45 0 1.102-1.035 1.102-2.659 0-1.623-.653-2.658-1.102-2.658zm3.946 2.322l-.932 1.602a6.598 6.598 0 0 1 1.48-.815 1.309 1.309 0 0 1-.548-.787zm-1.932-.64l.018.12a6.927 6.927 0 0 1 .032 1.401l.856-1.432a1.34 1.34 0 0 1-.906-.09zm6.755-2.429c-.608 0-1.366.236-2.08.647-.653.378-1.21.874-1.53 1.361-.25.384-.333.73-.221.922.087.152.314.247.632.269l.142.004c.608 0 1.365-.236 2.079-.648 1.405-.812 1.976-1.894 1.752-2.282-.101-.174-.383-.273-.774-.273zM8.12 3.884c-.448 0-1.1 1.034-1.1 2.658 0 1.623.652 2.658 1.1 2.658.449 0 1.102-1.035 1.102-2.658S8.569 3.883 8.12 3.883zm2.03 3.512c-.029.24-.072.468-.127.684.085.003.17.028.25.075l.016.01c.08.052.144.12.19.197.163-.164.346-.322.542-.472a1.3 1.3 0 0 1-.488-.164 1.344 1.344 0 0 1-.382-.33zm3.328-5.174c-.505 0-1.404.631-2.078 1.8-.378.654-.613 1.363-.645 1.944-.026.458.075.798.269.91.412.238 1.5-.395 2.283-1.75.377-.655.612-1.364.644-1.945.025-.457-.075-.797-.27-.91a.394.394 0 0 0-.203-.049z"></path></svg>',
          kc_al_peanuts : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-peanuts" viewBox="0 0 25 20"><path fill="#868686" fill-rule="evenodd" d="M9.371 8.662a.683.683 0 0 1-.851.46 5.332 5.332 0 0 1-3.677-3.923.685.685 0 1 1 1.334-.305c.105.457.348 1.133.91 1.762a3.976 3.976 0 0 0 1.825 1.155c.362.108.567.49.459.851m8.747-.878a7.666 7.666 0 0 1-1.958 2.896 7.606 7.606 0 0 1-2.19 1.409.686.686 0 0 1-.535-1.261 6.237 6.237 0 0 0 1.8-1.154 6.323 6.323 0 0 0 1.605-2.377.683.683 0 1 1 1.278.487m4.258 3.61c-1.275 2.992-4.12 5.447-7.247 6.254-.974.252-2.435.436-3.883-.097-1.308-.483-2.366-1.623-2.696-2.904a3.136 3.136 0 0 1-.044-1.401l.002-.006a3.08 3.08 0 0 1 .713-1.394c.612-.705 1.473-1.031 2.385-1.378.3-.114.6-.228.894-.356a6.808 6.808 0 0 0 1.189-.639l.027-.018.052-.037c1.038-.74 1.675-1.787 2.373-3.03.53-.95 1.078-1.93 1.878-2.562.705-.556 1.445-.715 2.205-.464 1.12.368 2.172 1.607 2.555 3.012.432 1.578.285 3.409-.403 5.02M8.188 10.95c-.349.401-.616.84-.802 1.3-1.723-.633-3.215-1.715-4.246-3.096C2.01 7.63 1.48 5.105 1.912 3.276c.256-1.084 1.02-1.793 2.041-1.895 1.086-.112 2.095.493 2.576 1.534.103.222.194.45.284.678.2.5.406 1.016.725 1.5.76 1.154 1.895 1.848 2.992 2.52.602.368 1.181.723 1.67 1.135-.077.036-.157.073-.241.11-.276.118-.558.224-.838.331-1.03.391-2.096.795-2.933 1.76m15.91-4.936c-.504-1.85-1.89-3.439-3.446-3.95-.837-.278-2.124-.381-3.48.69-1.014.802-1.63 1.902-2.253 3.016-.483.862-.942 1.633-1.54 2.2-.64-.608-1.398-1.071-2.134-1.521-1.014-.622-1.973-1.209-2.565-2.11-.243-.365-.415-.796-.597-1.252-.1-.248-.198-.498-.311-.743C7.042.762 5.49-.147 3.815.02 2.21.183.972 1.31.58 2.963.058 5.179.672 8.126 2.043 9.97c1.225 1.64 2.999 2.91 5.043 3.625-.026.456.02.922.14 1.392.437 1.704 1.83 3.213 3.546 3.848a7.19 7.19 0 0 0 2.487.427c.718 0 1.46-.095 2.212-.29 3.522-.91 6.727-3.673 8.164-7.04.817-1.918.982-4.02.464-5.919"></path></svg>',
          kc_al_treenuts : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-treenuts" viewBox="0 0 20 24"><path fill="#878787" fill-rule="evenodd" d="M9.902 0c.292 0 .536.244.536.537v1.829c4.537.268 8.342 3.732 8.951 8.293.05.463-.097.926-.365 1.268-.22.268-.513.439-.83.512v4.902c0 2.513-1.853 4.757-4.61 5.586l-3.512 1.049c-.048.024-.097.024-.146.024H9.86a.274.274 0 0 1-.105-.024c-.756-.22-1.536-.464-2.317-.708l-1.22-.366c-2.755-.829-4.585-3.073-4.585-5.56 0-1.269.025-2.513.025-3.781v-1.098a1.557 1.557 0 0 1-.854-.512 1.512 1.512 0 0 1-.39-1.268c.61-4.561 4.415-8.024 8.951-8.293V.537c0-.293.244-.537.537-.537zm7.146 12.512H2.731v1.073c-.024 1.244-.024 2.513-.024 3.756 0 2 1.536 3.805 3.804 4.513l1.22.366c.732.219 1.439.439 2.17.658l3.342-1c2.293-.707 3.83-2.512 3.83-4.537h-.025v-4.829zM9.878 3.44c-4.22 0-7.83 3.17-8.415 7.366a.523.523 0 0 0 .122.415c.097.121.244.17.39.17H17.78c.17 0 .292-.049.39-.17a.556.556 0 0 0 .122-.44c-.561-4.17-4.17-7.341-8.415-7.341zm4.243 6.122a.56.56 0 1 1 0 1.122.56.56 0 0 1 0-1.122zm1.854-2.049a.56.56 0 1 1-.001 0zm-3.146-.927a.56.56 0 1 1-.001 0z"></path></svg>',
          kc_al_eggs : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-egg" viewBox="0 0 19 24"><path fill="#878787" fill-rule="evenodd" d="M6.062 8.608a16.231 16.231 0 0 0-1.023 5.605.68.68 0 1 1-1.359 0c0-2.028.384-4.13 1.108-6.078a.679.679 0 1 1 1.273.473m2.021-3.68c-.32.406-.622.848-.897 1.313a.68.68 0 0 1-1.17-.691c.306-.518.643-1.01 1.002-1.464a.677.677 0 0 1 .953-.112.677.677 0 0 1 .112.954m1.731 17.714c-4.639 0-7.757-3.724-7.757-9.264 0-6.178 3.77-12.02 7.757-12.02 3.989 0 7.758 5.842 7.758 12.02 0 5.54-3.117 9.264-7.758 9.264M9.813 0C4.597 0 .7 7.063.7 13.378.699 19.632 4.446 24 9.813 24c5.369 0 9.116-4.368 9.116-10.622C18.929 7.063 15.03 0 9.813 0"></path></svg>',
          kc_al_dairy : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-milk" viewBox="0 0 18 24"><path fill="#868686" fill-rule="evenodd" d="M14.811 22.642H9.968V10.229h6.373v10.883c0 .843-.687 1.53-1.53 1.53zm-12.574-1.53V10.23h6.371v12.413H3.767c-.844 0-1.53-.687-1.53-1.53zM5.778 4.638h6.08L8.933 8.87h-6.08l2.925-4.232zm.325-1.36h6.373v-1.92H6.103v1.92zm9.622 5.592h-5.141l2.57-3.717 2.57 3.717zm1.974.59a.496.496 0 0 0-.084-.243l-3.78-5.471V.679A.68.68 0 0 0 13.154 0H5.423a.68.68 0 0 0-.68.68v3.066L1 9.163c-.01.014-.008.032-.016.045a.663.663 0 0 0-.087.252c-.003.022-.012.043-.013.065 0 .008-.006.016-.006.025v11.562A2.89 2.89 0 0 0 3.767 24H14.81a2.891 2.891 0 0 0 2.888-2.888V9.46z"></path></svg>',
          kc_al_sesame : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-sesame" viewBox="0 0 21 24"><path fill="#868686" fill-rule="evenodd" d="M6.067 14.711a.479.479 0 0 1 .424 0c.033.017.819.412 1.594 1.343.707.848 1.55 2.33 1.55 4.57 0 1.295-.336 2.19-1.025 2.735-.694.55-1.61.62-2.331.62-.72 0-1.637-.07-2.332-.62-.689-.546-1.024-1.44-1.024-2.735 0-2.24.843-3.722 1.55-4.57.775-.93 1.56-1.326 1.594-1.343zm.212.984a4.99 4.99 0 0 0-1.1 1.005c-.863 1.053-1.3 2.373-1.3 3.924 0 .984.216 1.633.661 1.986.362.286.898.414 1.739.414.84 0 1.377-.128 1.739-.414.445-.353.661-1.002.661-1.986 0-1.55-.437-2.87-1.3-3.924a4.99 4.99 0 0 0-1.1-1.005zm5.718-4.088c.035-.012.87-.288 2.077-.178 1.1.1 2.743.553 4.327 2.136.915.916 1.311 1.785 1.21 2.658-.103.88-.7 1.578-1.21 2.088-.51.509-1.208 1.107-2.087 1.21-.09.01-.178.015-.267.015-.784 0-1.57-.403-2.392-1.225-1.583-1.584-2.035-3.228-2.135-4.328-.11-1.206.165-2.041.177-2.076a.48.48 0 0 1 .3-.3zm5.728 2.633c-2.18-2.179-4.452-1.94-5.182-1.788-.06.29-.134.823-.068 1.49.135 1.354.76 2.597 1.856 3.693.695.696 1.308 1.002 1.872.937.458-.054.928-.343 1.522-.937.594-.594.883-1.064.937-1.522.065-.564-.241-1.177-.937-1.873zm-1.002 2.384a.478.478 0 0 1 .675.676c-.212.212-.541.508-.952.635a.478.478 0 0 1-.281-.913c.158-.049.335-.175.558-.398zm-2.1 0a.48.48 0 0 1 .676 0c.027.028.054.054.08.078a.477.477 0 1 1-.648.702l-.108-.104a.48.48 0 0 1 0-.676zM4.108 5.104c2.24 0 3.72.843 4.57 1.55.93.775 1.326 1.561 1.342 1.594a.472.472 0 0 1 0 .424c-.016.033-.412.82-1.342 1.594-.85.707-2.33 1.55-4.57 1.55-1.295 0-2.19-.335-2.736-1.024-.55-.695-.62-1.611-.62-2.332 0-.72.07-1.637.62-2.331.546-.69 1.44-1.024 2.736-1.024zm0 .956c-.984 0-1.634.216-1.986.662-.287.361-.414.898-.414 1.738s.127 1.377.414 1.739c.352.445 1.002.661 1.986.661 1.55 0 2.87-.437 3.924-1.3a5.004 5.004 0 0 0 1.004-1.1 5.027 5.027 0 0 0-1.004-1.1c-1.054-.863-2.374-1.3-3.924-1.3zM15.576.016c.873-.102 1.742.294 2.658 1.21 1.583 1.583 2.035 3.227 2.136 4.327.11 1.206-.166 2.041-.178 2.076a.48.48 0 0 1-.3.3c-.03.01-.616.203-1.51.203-.177 0-.367-.007-.566-.025-1.1-.1-2.744-.553-4.328-2.136-.915-.916-1.311-1.785-1.21-2.658.103-.88.7-1.578 1.21-2.087.51-.51 1.208-1.108 2.088-1.21zm.26.94c-.05 0-.1.003-.15.009-.458.053-.928.342-1.522.936-.594.594-.883 1.064-.937 1.522-.065.564.241 1.177.937 1.873 1.096 1.096 2.339 1.72 3.693 1.855a5.04 5.04 0 0 0 1.49-.068c.059-.29.133-.823.067-1.488-.135-1.355-.76-2.598-1.856-3.694-.634-.634-1.2-.945-1.722-.945z"></path></svg>',
          kc_al_soy : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-soy" viewBox="0 0 25 24"><path fill="#878787" fill-rule="evenodd" d="M17.742 0l.252.002c1.522.032 4.374.935 4.868 1.095l.07.022a.547.547 0 0 1 .347.347c.045.135 1.084 3.306 1.118 4.941a6.553 6.553 0 0 1-4.275 6.275c-.727.27-1.313.868-1.61 1.644a6.557 6.557 0 0 1-3.788 3.789c-.775.295-1.374.881-1.643 1.608A6.556 6.556 0 0 1 6.943 24c-.047 0-.092 0-.14-.002-1.636-.034-4.794-1.085-4.927-1.13a.548.548 0 0 1-.346-.344C1.486 22.39.434 19.23.4 17.594a6.554 6.554 0 0 1 4.275-6.275c.728-.27 1.314-.869 1.61-1.644a6.564 6.564 0 0 1 3.788-3.79c.776-.295 1.374-.88 1.644-1.608.97-2.616 3.494-4.348 6.277-4.275zm.228 1.092c-2.3-.07-4.422 1.384-5.23 3.564-.379 1.022-1.21 1.841-2.28 2.249a5.472 5.472 0 0 0-3.157 3.158c-.407 1.07-1.227 1.9-2.249 2.278a5.464 5.464 0 0 0-3.564 5.23c.026 1.221.742 3.566.99 4.347.781.249 3.126.964 4.347.99 2.324.077 4.422-1.383 5.23-3.564.379-1.022 1.21-1.842 2.28-2.25a5.467 5.467 0 0 0 3.157-3.157c.407-1.07 1.227-1.9 2.249-2.278a5.463 5.463 0 0 0 3.563-5.23c-.025-1.221-.732-3.572-.979-4.358-.786-.247-3.136-.953-4.357-.979zM6.944 14.182a3.276 3.276 0 0 1 3.273 3.272 3.276 3.276 0 0 1-3.273 3.273 3.276 3.276 0 0 1-3.273-3.273 3.276 3.276 0 0 1 3.273-3.272zm0 1.09c-1.203 0-2.182.98-2.182 2.182 0 1.204.98 2.182 2.182 2.182a2.184 2.184 0 0 0 2.182-2.182c0-1.203-.98-2.181-2.182-2.181zm5.454-6.545A3.276 3.276 0 0 1 15.671 12a3.276 3.276 0 0 1-3.273 3.273A3.276 3.276 0 0 1 9.126 12a3.276 3.276 0 0 1 3.272-3.273zm0 1.091A2.184 2.184 0 0 0 10.217 12c0 1.203.979 2.182 2.181 2.182A2.185 2.185 0 0 0 14.58 12a2.185 2.185 0 0 0-2.182-2.182zm5.455-6.545a3.276 3.276 0 0 1 3.273 3.272 3.276 3.276 0 0 1-3.273 3.273 3.276 3.276 0 0 1-3.273-3.273 3.276 3.276 0 0 1 3.273-3.272zm0 1.09a2.185 2.185 0 0 0-2.182 2.182c0 1.204.98 2.182 2.182 2.182a2.184 2.184 0 0 0 2.182-2.182c0-1.203-.98-2.181-2.182-2.181z"></path></svg>'
        },
        product_types ={
          wm_black_label : 'Black Label',
          wm_low_carb : 'Low Carb',
          wm_breakfast : 'Breakfast',
          wm_clean_meals : 'Clean',
          wm_clean_vegan : 'Vegan',
        };


    function createProductsVariants(products){
      let all_products_variants = [];
      for (let i = 0; products.length> i; i++){
        let product = products[i],
            product_v_img = product.images[0],
            product_v_title = product.title,
            product_v_allergens = [];

        for(let k=0; product.tags.length > k; k++){
          if(product.tags[k].indexOf('kc_al_') != -1 ){
            product_v_allergens.push(product.tags[k]);
          }
        }

        for (let j = 0; product.variants.length > j; j++) {
          let product_v_size = '';
          if(product.variants[j].title != 'Default Title'){
            product_v_size += product.variants[j].title;
          }
          let product_v_obj = {
            'product_p_id': product.apiId,
            'product_v_img': product_v_img,
            'product_v_title': product_v_title,
            'product_v_size': product_v_size,
            'product_v_id': product.variants[j].apiId,
            'product_v_price': product.variants[j].price,
            'product_v_nutritions': product.variants[j].nutritions,
            'product_v_calories': product.variants[j].nutritions.Calories,
            'product_v_weight': product.variants[j].totalWeight,
            'product_v_tags': product.tags,
            'product_v_allergens': product_v_allergens
          };
          all_products_variants.push(product_v_obj);
        }
      }
      compareProductsCalories(all_products_variants);
      $('.subscription-product-new').click(() => addNewSubsProduct(all_products_variants));
    }

    function compareProductsCalories(products){
      $('.change-meals-body').on('click', '.subscription-edit', function () {
        $('.pop-up-change-meal-tabs span').removeClass('active');
        $('.pop-up-change-meal-tabs span:first-child').addClass('active');
        $('.pop-up-change-meal h3').addClass('hide');
        $('.collection-meals-block').empty();
        $('.pop-up-change-meal').addClass('change-meal').removeClass('new-meal');
        $('body').addClass('active-pop-up');
        $('.subscription-product-info').removeClass('product-to-change');
        $('.change-meals-body-row').removeClass('product-to-change');
        $(this).parent().parent().addClass('product-to-change');

        let meal_block = $(this).parent().parent(),
            special_meal = meal_block.data('vegan'),
            first_price = meal_block.attr('data-variant-price'),
            products_in_order = productsInOrder(),
            change_products = notCopyProducts(products, products_in_order),

            discount_type = meal_block.data('discount-type'),
            discount_value = meal_block.data('discount-value'),
            regular_price = meal_block.attr('data-variant-price-regular'),
            discount_sum = sumRound(regular_price*1 - first_price*1);

        setProductsInPopUp(change_products, special_meal, first_price, discount_type, discount_value, discount_sum);

        $('.pop-up-change-meal').attr('data-change-price', first_price).attr('data-discount_type', discount_type).attr('data-discount_value', discount_value).attr('data-discount_sum', discount_sum);
      });
    }

    function notCopyProducts(products, products_in_order) {
      let copy_products = [...products];
      for(let i=0; products_in_order.length>i; i++){
        let remove_variant = products_in_order[i];
        for(let j=0; copy_products.length>j; j++){
          let product = copy_products[j];
          if(product.product_v_id*1 === remove_variant*1){
            copy_products.splice(j, 1);
          }
        }
      }
      return copy_products
    }

    function productsInOrder() {
      let products_in_order = [];
      $('.change-meals-body-row').each(function () {
        let stroke = $(this);
        if(stroke.hasClass('product-to-remove')){
        }else{
          let product_v_id = $(stroke).attr('data-variant-id');
          products_in_order.push(product_v_id);
        }
      });
      $('.meal-from-meal-pack').each(function () {
        let stroke = $(this);
        if(stroke.hasClass('product-to-remove')){
        }else{
          let product_v_id = $(stroke).attr('data-variant-id');
          products_in_order.push(product_v_id);
        }
      });
      return products_in_order;
    }

    function setProductsInPopUp(change_products, special_meal, first_price, discount_type, discount_value, discount_sum) {
      if(special_meal){
        let products_set = [];
        for(let i = 0; change_products.length>i; i++){
          if(change_products[i].product_v_tags.indexOf(special_meal) != -1){
            products_set.push(change_products[i]);
          }
        }
        for(let i = 0; products_set.length>i; i++){
          createProductBlock(products_set[i], first_price, discount_type, discount_value, discount_sum);
        }
        $('.pop-up-change-meal').addClass('special-meal');
        $('.pop-up-change-meal-tabs').addClass('hide');
      }else{
        $('.pop-up-change-meal-tabs').removeClass('hide');
        popUpFiltering(change_products);
        /*console.log('change products');
                console.log(change_products);*/

        for(let i = 0; change_products.length>i; i++){
          createProductBlock(change_products[i], first_price, discount_type, discount_value, discount_sum);
        }
      }

      $('.pop-up-change-meal').removeClass('hide');
      $('.pop-up-change-meal h2').text('SELECT A MEAL');
    }

    function popUpFiltering(all_products){
      $('.change-meal .pop-up-change-meal-tabs option.special-tag').attr('disabled','true');

      $('.pop-up-change-meal-tabs span').click(function () {
        $('.pop-up-change-meal h3').addClass('hide');
        $('.pop-up-change-meal-tabs span').removeClass('active');
        $('.collection-meals-block').empty();
        $(this).addClass('active');
        let tag = $(this).data('tag'),
            first_price = $('.pop-up-change-meal').data('change-price'),
            discount_type, discount_value, discount_sum ;
        filteringProducts(all_products, tag, first_price, discount_type, discount_value, discount_sum);
      });

      $('select.pop-up-change-meal-tabs').change(function () {
        $('.pop-up-change-meal h3').addClass('hide');
        $('.collection-meals-block').empty();
        let tag = $('select.pop-up-change-meal-tabs').val(),
            first_price = $('.pop-up-change-meal').data('change-price'),
            discount_type = $('.pop-up-change-meal').data('discount_type'),
            discount_value = $('.pop-up-change-meal').data('discount_value'),
            discount_sum = $('.pop-up-change-meal').data('discount_sum');
        filteringProducts(all_products, tag, first_price, discount_type, discount_value, discount_sum);
      });
    }

    function filteringProducts(all_products, tag, first_price, discount_type, discount_value, discount_sum){
      let products_with_tag = [];
      if(tag == 'all'){
        products_with_tag = all_products.slice(0);
      }else{
        for(let i = 0; all_products.length>i; i++){
          let product = all_products[i];
          if(product.product_v_tags.indexOf(tag) != -1){
            products_with_tag.push(product);
          }
        }
      }

      if(products_with_tag.length == 0 ){
        $('.pop-up-change-meal h3').removeClass('hide');
      }else{
        $('.pop-up-change-meal h3').addClass('hide');
        for(let i = 0; products_with_tag.length>i; i++){
          createProductBlock(products_with_tag[i], first_price, discount_type, discount_value, discount_sum);
        }
      }
    }

    function createProductBlock(product, first_price, discount_type, discount_value, discount_sum) {
      let image_product,
          allergens_block = '',
          product_price = product.product_v_price*1,
          block_price,
          product_type = '',
          units = 'g';

      if(product.product_v_tags.indexOf('juice') != -1) {
        units = 'ml';
      }

      if(product.product_v_img){
        image_product = createSmallImage(product.product_v_img);
      }else{
        image_product = '';
      }

      if(product.product_v_tags.indexOf('wm_black_label') != -1){
        product_type = product_types.wm_black_label;
      }else if(product.product_v_tags.indexOf('wm_low_carb') != -1){
        product_type = product_types.wm_low_carb;
      }else if(product.product_v_tags.indexOf('wm_breakfast') != -1){
        product_type = product_types.wm_breakfast;
      }else if(product.product_v_tags.indexOf('wm_clean_meals') != -1){
        product_type = product_types.wm_clean_meals;
      }else if(product.product_v_tags.indexOf('wm_clean_vegan') != -1){
        product_type = product_types.wm_clean_vegan;
      }else if(product.product_v_tags.indexOf('snack') != -1){
          product_type = 'Snack';
      }else if(product.product_v_tags.indexOf('juice') != -1){
          product_type = 'Juice';
      }else{
        product_type = 'All';
      }

      if(discount_type == "FIXED"){
        product_price =  sumRound(product_price - (discount_sum *1 ));
      }else if( discount_type == "PERCENT"){
        product_price =  sumRound(product_price - (product_price *discount_value/100 ));
      }

      if(first_price > 0){
        block_price = Math.round ((first_price - product_price)*100)/100;
        if(block_price == 0){
          block_price = 'same price';
        }else{
          block_price > 0 ? block_price = '- $'+(block_price).toFixed(2) : block_price = '+ $'+(block_price*(-1)).toFixed(2);
        }
      }else{
        block_price = '$'+ Math.round (product_price*100)/100;
      }

      for(let i=0; product.product_v_allergens.length>i; i++){
        let key = product.product_v_allergens[i];
        allergens_block += allergens_icons[key];
      }

      let product_block_nutrition = '<p><span class="to-day-protein">'+ product.product_v_nutritions.Protein +'</span>Protein (g)</p>\n' +
          '<p><span class="to-day-cal">'+ product.product_v_nutritions.Calories +'</span>Calories</p>\n' +
          '<p><span class="to-day-carbs">'+ product.product_v_nutritions.Carbohydrate +'</span>Carbs (g)</p>\n' +
          '<p><span class="to-day-fat">'+ product.product_v_nutritions.Fat_Total +'</span>Fat (g)</p>',

          product_block = '<div>' +
              '<div><img '+image_product+' alt="'+ product.product_v_title +' - Workout Meals ™">' +
              '<p class="product-type">'+ product_type +'</p><div class="short-info"><p><span>'+ product.product_v_size +' </span>' +
              '<span> '+ product.product_v_weight +' ('+ units +')</span></p><p>'+ allergens_block +'</p></div></div>' +
              '<div><p class="title">' + product.product_v_title + '</p>' +
              '<div class="meal-nutrition">'+ product_block_nutrition +'</div>' +
              '<div class="select_button"><p>'+ block_price +'</p><button data-product-id="'+ product.product_p_id +'" data-id="'+product.product_v_id+'" data-price="'+product_price+'">Select</button></div></div></div>';

      let container = $('.collection-meals-block');
      container.append(product_block);
    }

    function createSmallImage(image){
      let img_small = image.replace('.jpg','_260x.jpg'),
          img_medium = image.replace('.jpg','_390x.jpg'),
          img_large = image.replace('.jpg','_520x.jpg'),
          full_img = 'srcset="'+ img_small +', '+ img_medium +' 1.5x, '+ img_large +' 2x" ' +
              'src="'+ img_small +'"';
      return full_img;
    }

    $('.collection-meals-block').on('click', 'button', function () {
      let pop_up = $('.pop-up-change-meal'),
          button = $(this),
          variant_id = button.data('id'),
          content_block = button.parent().parent(),
          full_block = button.parent().parent().parent(),
          variant_img = full_block.find('img').attr('srcset'),
          variant_title = content_block.find('.title').text(),
          product_size = full_block.find('.short-info p:first-child span:first-child').text(),
          variant_price = button.data('price')*1,
          id = button.data('product-id'),

          product = {
            product_id: id,
            id: variant_id,
            img: variant_img,
            title: variant_title,
            price: variant_price,
            size: product_size,
          };

      if(pop_up.hasClass('change-meal')){
        changeMeal(product);
      }else if(pop_up.hasClass('new-meal')){
        addMeal(product);
      }

      $('.pop-up-change-meal').addClass('hide');
      $('body').removeClass('active-pop-up');
      updateMealsPackSum();
    });

    function updateMealsPackSum(){
      $('.meal-pack-row-content').each(function () {
        let pack_sum = 0;
        $(this).find('.subscription-product').each(function () {
          let product_sum,
              product_price = $(this).find('.subscription-product-price span').text(),
              product_qty = $(this).find('.subscription-product-count span').text();
          /*console.log('price = '+product_price);*/
          product_sum = product_price*product_qty;
          pack_sum = pack_sum + product_sum;
        });
        let sum = (pack_sum).toFixed(2);
        $(this).prev('.meal-pack-row-header').find('td.text-center').text('$ '+sum);
      });
      changeTotalSum();
    };

    function changeMeal(product){
      let product_to_change = $('.change-meals-body-row').filter('.product-to-change'),
          product_qty = product_to_change.find('.subscription-product-count span').text()*1,
          product_price = product.price,
          product_total,
          regular_price,
          meal_to_change = $('.meal-pack-row-content').find('.product-to-change');

      if($(meal_to_change).hasClass('meal-from-meal-pack')){
        let discount_type = $(meal_to_change).attr('data-discount-type'),
            discount_value = $(meal_to_change).attr('data-discount-value'),
            meal_to_change_price = $(meal_to_change).attr('data-variant-price')*1,
            meal_to_change_regular_price = $(meal_to_change).attr('data-variant-price-regular')*1,
            discount = sumRound(meal_to_change_regular_price - meal_to_change_price);

        if(discount_type == "FIXED"){
          regular_price = (product_price*1 + discount*1).toFixed(2);
        }else if(discount_type == "PERCENT"){
          regular_price = (product_price + (product_price * discount_value / 100)).toFixed(2);
        }
      }else{
        regular_price = product_price;
      }

      meal_to_change.find('.subscription-product-title span:first-child').text(product.title);
      meal_to_change.find('.subscription-product-title span:last-child').text(' ( ' +product.size+ ')');
      meal_to_change.attr({
        'data-variant-id': product.id,
        'data-variant-price': product_price,
        'data-variant-price-regular': regular_price,
        'data-product-id': product.product_id});
      meal_to_change.find('.subscription-product-price span').text(product_price);
      meal_to_change.prev('.subscription-product-image').html('<img  srcset="' + product.img + '" alt="'+ product.title +'">');

      product_qty > 1 ? product_total = product_price * product_qty : product_total = product_price;

      product_to_change.find('.subscription-product-title').text(product.title);
      product_to_change.find('.subscription-variant-title').text(product.size);
      $(product_to_change).attr({
        'data-variant-id': product.id,
        'data-variant-price': product_price,
        'data-product-id': product.product_id});
      product_to_change.find('.subscription-product-price span').text(product_price);
      product_to_change.find('.subscription-product-image').html('<img  srcset="' + product.img + '" alt="'+ product.title +'">');
      let round_product_total = Math.round(product_total*100)/100;
      product_to_change.find('.subscription-product-total span').text(round_product_total);

      changeTotalSum();
    }

    function addMeal(product) {
      let new_product = '<tr class="change-meals-body-row" data-product-id="'+ product.product_id+'" data-variant-price="'+ product.price +'" data-variant-id="'+product.id+'">\n' +
          '<td>\n' +
          '<div class="subscription-product">\n' +
          '<div class="subscription-product-image">\n' +
          '<img src="'+ product.img +'" alt="'+ product.title +'">\n' +
          '</div>\n' +
          '<div class="subscription-product-info">\n' +
          '<h3 class="text-left subscription-product-title">'+ product.title +'</h3>\n' +
          '<span class="subscription-variant-title">'+ product.size +'</span>\n' +
          '</div>\n' +
          '</div>\n' +
          '</td>\n' +
          '<td class="text-center subscription-product-quantity">\n' +
          '<div class="subscription-product-count">\n' +
          '<button class="subscription-product-remove"><svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-minus" viewBox="0 0 20 20"><path fill="#444" d="M17.543 11.029H2.1A1.032 1.032 0 0 1 1.071 10c0-.566.463-1.029 1.029-1.029h15.443c.566 0 1.029.463 1.029 1.029 0 .566-.463 1.029-1.029 1.029z"></path></svg></button>\n' +
          '<span>1</span>\n' +
          '<button class="subscription-product-add"><svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-plus" viewBox="0 0 20 20"><path fill="#444" d="M17.409 8.929h-6.695V2.258c0-.566-.506-1.029-1.071-1.029s-1.071.463-1.071 1.029v6.671H1.967C1.401 8.929.938 9.435.938 10s.463 1.071 1.029 1.071h6.605V17.7c0 .566.506 1.029 1.071 1.029s1.071-.463 1.071-1.029v-6.629h6.695c.566 0 1.029-.506 1.029-1.071s-.463-1.071-1.029-1.071z"></path></svg></button>\n' +
          '</div>\n' +
          '<div class="subscription-product-price mobile-show">$<span>'+ product.price +'</span></div>' +
          '</td>\n' +
          '<td class="text-right subscription-product-price mobile-hide">$<span>'+ product.price +'</span></td>\n' +
          '<td class="text-right subscription-product-total mobile-hide">$<span>'+ product.price +'</span></td>\n' +
          '<td class="text-right">\n' +
          '<button class="subscription-edit">\n' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21">\n' +
          '<path fill="#212B36" fill-rule="evenodd" d="M17.086 3.444c-1.22-1.236-3.198-1.234-4.414 0l-9.379 9.521c-.128.13-.219.293-.263.471l-1 4.061c-.086.346.015.712.263.964.19.193.445.298.707.298.081 0 .162-.01.242-.03l4-1.016c.176-.044.337-.137.465-.267l9.38-9.521c1.216-1.236 1.216-3.246 0-4.481zm-1.414 3.045L15 7.172l-1.586-1.61.672-.683c.438-.442 1.15-.442 1.586 0 .437.445.437 1.167 0 1.61zM5.414 13.683L12 6.997l1.586 1.61L7 15.293l-1.586-1.61z"></path>\n' +
          '</svg>\n' +
          '</button>\n' +
          '<button class="subscription-delete mobile-show">\n' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21">\n' +
          '<path fill="#212B36" fill-rule="evenodd" d="M11 16.73h3V8.61h-3v8.12zm-5 0h3V8.61H6v8.12zM8 6.58h4v-2.03H8v2.03zm9 0h-3v-2.03c0-1.12-.897-2.031-2-2.031H8c-1.103 0-2 .91-2 2.03v2.03H3c-.553 0-1 .456-1 1.016s.447 1.015 1 1.015h1v9.137c0 .56.447 1.015 1 1.015h10c.553 0 1-.455 1-1.015V8.609h1c.553 0 1-.455 1-1.015 0-.56-.447-1.015-1-1.015z"></path>\n' +
          '</svg>\n' +
          '</button>\n' +
          '</td>\n' +
          '<td class="text-right">\n' +
          '<button class="subscription-delete mobile-hide">\n' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21">\n' +
          '<path fill="#212B36" fill-rule="evenodd" d="M11 16.73h3V8.61h-3v8.12zm-5 0h3V8.61H6v8.12zM8 6.58h4v-2.03H8v2.03zm9 0h-3v-2.03c0-1.12-.897-2.031-2-2.031H8c-1.103 0-2 .91-2 2.03v2.03H3c-.553 0-1 .456-1 1.016s.447 1.015 1 1.015h1v9.137c0 .56.447 1.015 1 1.015h10c.553 0 1-.455 1-1.015V8.609h1c.553 0 1-.455 1-1.015 0-.56-.447-1.015-1-1.015z"></path>\n' +
          '</svg>\n' +
          '</button>\n' +
          '</td>\n' +
          '</tr>';
      $('.change-meals-body').append(new_product);

      changeTotalSum();
    }

    $('.btn-meals-save').click(function(){
      showSpinner();
      let line_items = [],
          customer = $('.change-meals-body').data('customer-id'),
          subscription = $('.change-meals-body').data('subscription-id');

      $('.change-meals-body-row').each(function () {
        if($(this).hasClass('product-to-remove')){
          console.log('del');
        }else{
          let product = findNewSubsProduct($(this));
          line_items.push(product);
        }
      });

      $('.meal-pack-row-header').each(function () {
        if($(this).hasClass('product-to-remove')){
          console.log('del');
        }else{
          $(this).next('.meal-pack-row-content').find('.subscription-product').each(function () {
            let product_info = $(this).find(".subscription-product-info"),
                product = findNewSubsMeal(product_info);
            line_items.push(product);
          });
        }
      });

      line_items = line_items.reverse();

      newOrder(line_items, customer, subscription);
    });

    function showSpinner() {
      $('.custom-spinner').removeClass('hide');
      $('body').addClass('active-pop-up');
    }

    function closeSpinner() {
      $('.custom-spinner').addClass('hide');
      $('body').removeClass('active-pop-up');
    }

    function findNewSubsProduct(product){
      let id = product.attr('data-variant-id'),
          title = product.find('.subscription-product-title').text(),
          size = product.find('.subscription-variant-title').text(),
          qty = product.find('.subscription-product-quantity .subscription-product-count span').text()*1,
          price = product.attr('data-variant-price')*1,
          product_id = product.attr('data-product-id'),
          mealpack = [],
          properties = [];

      let new_product = newOrderProduct(product_id, id, title, size, qty, price, properties, price, mealpack);
      return new_product;
    };

    function findNewSubsMeal(product){
      let id = product.attr('data-variant-id'),
          title = product.find('.subscription-product-title span:first-child').text(),
          size = product.find('.subscription-variant-title span:last-child').text(),
          qty = product.find('.subscription-product-count span').text()*1,
          price = product.attr('data-variant-price')*1,
          product_id = product.attr('data-product-id'),
          regular_price = product.attr('data-variant-price-regular') * qty,


          mealpack_id = product.attr('data-meal-pack-id'),
          mealpack_name = product.attr('data-meal-pack-name'),
          mealpack_discount = product.attr('data-discount-value'),
          mealpack_discount_type = product.attr('data-discount-type'),
          properties_gwa_mp_discount_fixed = product.attr('data-property-discount-fixed'),
          properties_meal_pack_uniq_id = product.attr('data-property-uniq-id'),
          properties_Meal_Pack = mealpack_name,
          properties_meal_pack_prod_id = mealpack_id,
          properties_Day = product.attr('data-property-day'),

          mealpack = [{"id" : mealpack_id}, {"name" : mealpack_name}, {"discount" : mealpack_discount}, {"discount_type": mealpack_discount_type}],
          properties = [
            {"name": "_gwa_mp_discount_fixed", "value": properties_gwa_mp_discount_fixed},
            {"name": "_meal_pack_uniq_id", "value": properties_meal_pack_uniq_id},
            {"name": "Meal Pack", "value": properties_Meal_Pack},
            {"name": "_meal_pack_prod_id", "value": properties_meal_pack_prod_id},
            {"name": "Day", "value": properties_Day}];


      let new_product = newOrderProduct(product_id, id, title, size, qty, price, properties, regular_price, mealpack, properties_Day);
      return new_product;
    };

    function newOrder(line_items, customer, subscription){
      /* console.log(line_items);*/
      $.ajax({
        url: '/apps/'+ key_kitchen +'/updateSubscription',
        dataType: 'json',
        type: 'POST',
        data: {
          subscriptionId: subscription,
          customerApiId: customer,
          line_items: line_items,
        },
        success: function (response) {
          console.log(response);
          closeSpinner();
        },
        error: function (e) {
          console.log(e);
        }
      });
    }

    function newOrderProduct(product_id, id, title, size, qty, price, properties, regular_price, mealpack){

      let order_product = {
        variant_title: size,
        name: title +' - '+size,
        variant_id: id,
        title: title,
        quantity: qty,
        price: price,
        product_id: product_id,
        regular_price: regular_price,
        properties: properties,
        total_discount: (regular_price - price)*qty,
        mealpack: mealpack
      };

      return order_product;
    }

    function addNewSubsProduct(products) {
      $('.pop-up-change-meal-tabs span').removeClass('active');
      $('.pop-up-change-meal-tabs span:first-child').addClass('active');
      $('.pop-up-change-meal h3').addClass('hide');
      $('.collection-meals-block').empty();
      $('body').addClass('active-pop-up');
      $('.change-meals-body-row').removeClass('product-to-change');
      $(this).parent().parent().addClass('product-to-change');

      let special_meal = '',
          first_price = '',
          products_in_order = productsInOrder(),
          change_products = notCopyProducts(products, products_in_order),
          discount_type, discount_value, discount_sum;

      setProductsInPopUp(change_products, special_meal, first_price,  discount_type, discount_value, discount_sum);
      $('.pop-up-change-meal').addClass('new-meal').removeClass('change-meal').data('change-price', first_price);
    }

    function removeSubsProduct(product) {
      product.addClass('product-to-remove').css({'display': 'none'});
    }

    function changeSubsProductCount(product, qty, price) {
      let total = sumRound(qty*price);
      product.find('.subscription-product-count span').text(qty);
      product.find('.subscription-product-total span').text(total);

      changeTotalSum();
    }

    $('.change-meals-body').on('click', '.subscription-delete', function () {
      let product = $(this).parent().parent();
      removeSubsProduct(product);
      changeTotalSum();
    });

    $('.change-meals-body').on('click', '.subscription-product-add', function () {
      let button_add = $(this),
          product = button_add.parent().parent().parent(),
          qty = button_add.prev('span').text()*1+1,
          price = product.find('td.subscription-product-price span').text()*1;
      changeSubsProductCount(product, qty, price);
    });

    $('.change-meals-body').on('click', '.subscription-product-remove', function () {
      let button_add = $(this),
          product = button_add.parent().parent().parent(),
          qty = button_add.next('span').text()*1-1,
          price = product.find('td.subscription-product-price span').text()*1;
      if( qty > 0 ){
        changeSubsProductCount(product, qty, price);
      }else {
        removeSubsProduct(product);
      }
    });
  },

};
/* ================ GLOBAL ================ */
/*============================================================================
  Drawer modules
==============================================================================*/
theme.Drawers = (function() {
  function Drawer(id, position, options) {
    var defaults = {
      close: '.js-drawer-close',
      open: '.js-drawer-open-' + position,
      openClass: 'js-drawer-open',
      dirOpenClass: 'js-drawer-open-' + position
    };

    this.nodes = {
      $parent: $('html').add('body'),
      $page: $('#PageContainer')
    };

    this.config = $.extend(defaults, options);
    this.position = position;

    this.$drawer = $('#' + id);

    if (!this.$drawer.length) {
      return false;
    }

    this.drawerIsOpen = false;
    this.init();
  }

  Drawer.prototype.init = function() {
    $(this.config.open).on('click', $.proxy(this.open, this));
    this.$drawer.on('click', this.config.close, $.proxy(this.close, this));
  };

  Drawer.prototype.open = function(evt) {
    // Keep track if drawer was opened from a click, or called by another function
    var externalCall = false;

    // Prevent following href if link is clicked
    if (evt) {
      evt.preventDefault();
    } else {
      externalCall = true;
    }

    // Without this, the drawer opens, the click event bubbles up to nodes.$page
    // which closes the drawer.
    if (evt && evt.stopPropagation) {
      evt.stopPropagation();
      // save the source of the click, we'll focus to this on close
      this.$activeSource = $(evt.currentTarget);
    }

    if (this.drawerIsOpen && !externalCall) {
      return this.close();
    }

    // Add is-transitioning class to moved elements on open so drawer can have
    // transition for close animation
    this.$drawer.prepareTransition();

    this.nodes.$parent.addClass(
        this.config.openClass + ' ' + this.config.dirOpenClass
    );
    this.drawerIsOpen = true;

    // Set focus on drawer
    slate.a11y.trapFocus({
      $container: this.$drawer,
      namespace: 'drawer_focus'
    });

    // Run function when draw opens if set
    if (
        this.config.onDrawerOpen &&
        typeof this.config.onDrawerOpen === 'function'
    ) {
      if (!externalCall) {
        this.config.onDrawerOpen();
      }
    }

    if (this.$activeSource && this.$activeSource.attr('aria-expanded')) {
      this.$activeSource.attr('aria-expanded', 'true');
    }

    this.bindEvents();

    return this;
  };

  Drawer.prototype.close = function() {
    if (!this.drawerIsOpen) {
      // don't close a closed drawer
      return;
    }

    // deselect any focused form elements
    $(document.activeElement).trigger('blur');

    // Ensure closing transition is applied to moved elements, like the nav
    this.$drawer.prepareTransition();

    this.nodes.$parent.removeClass(
        this.config.dirOpenClass + ' ' + this.config.openClass
    );

    if (this.$activeSource && this.$activeSource.attr('aria-expanded')) {
      this.$activeSource.attr('aria-expanded', 'false');
    }

    this.drawerIsOpen = false;

    // Remove focus on drawer
    slate.a11y.removeTrapFocus({
      $container: this.$drawer,
      namespace: 'drawer_focus'
    });

    this.unbindEvents();

    // Run function when draw closes if set
    if (
        this.config.onDrawerClose &&
        typeof this.config.onDrawerClose === 'function'
    ) {
      this.config.onDrawerClose();
    }
  };

  Drawer.prototype.bindEvents = function() {
    this.nodes.$page.on(
        'click.drawer',
        $.proxy(function() {
          this.close();
          return false;
        }, this)
    );
  };

  Drawer.prototype.unbindEvents = function() {
    this.nodes.$page.off('.drawer');
    this.nodes.$parent.off('.drawer');
  };

  return Drawer;
})();

/*============================================================================
 Customized version of Shopify's jQuery API
 (c) Copyright 2009-2015 Shopify Inc. Author: Caroline Schnapp. All Rights Reserved.
 ==============================================================================*/
if ((typeof ShopifyAPI) === 'undefined') { ShopifyAPI = {}; }
/*============================================================================
 API Helper Functions
 ==============================================================================*/
function attributeToString(attribute) {
  if ((typeof attribute) !== 'string') {
    attribute += '';
    if (attribute === 'undefined') {
      attribute = '';
    }
  }
  return jQuery.trim(attribute);
}
/*============================================================================
 API Functions
 ==============================================================================*/
ShopifyAPI.onCartUpdate = function(cart) {
  // alert('There are now ' + cart.item_count + ' items in the cart.');
};

ShopifyAPI.updateCartNote = function(note, callback) {
  var params = {
    type: 'POST',
    url: '/cart/update.js',
    data: 'note=' + attributeToString(note),
    dataType: 'json',
    success: function(cart) {
      if ((typeof callback) === 'function') {
        callback(cart);
      }
      else {
        ShopifyAPI.onCartUpdate(cart);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      ShopifyAPI.onError(XMLHttpRequest, textStatus);
    }
  };
  jQuery.ajax(params);
};
ShopifyAPI.updateAttributes = function(note, callback) {
  var params = {
    type: 'POST',
    url: '/cart/update.js',
    data: {"attributes[discount]": attributeToString(note)},
    dataType: 'json',
    success: function(cart) {
      if ((typeof callback) === 'function') {
        callback(cart);
      }
      else {
        ShopifyAPI.onCartUpdate(cart);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      ShopifyAPI.onError(XMLHttpRequest, textStatus);
    }
  };
  jQuery.ajax(params);
};

ShopifyAPI.onError = function(XMLHttpRequest, textStatus) {
  var data = eval('(' + XMLHttpRequest.responseText + ')');
  if (!!data.message) {
    alert(data.message + '(' + data.status  + '): ' + data.description);
  }
};

ShopifyAPI.onItemAdded = function(cart) {
  //console.log(cart.item_count + ' items in your shopping cart.');
  $('.site-header__cart-count').removeClass('hide').find('span:not(.icon__fallback-text)').text(cart.item_count);
};

/*============================================================================
 POST to cart/add.js returns the JSON of the cart
 - Allow use of form element instead of just id
 - Allow custom error callback
 ==============================================================================*/
ShopifyAPI.addItemFromForm = function(form, callback, errorCallback) {
  var params = {
    type: 'POST',
    url: '/cart/add.js',
    data: jQuery(form).serialize(),
    dataType: 'json',
    success: function(line_item) {
      if ((typeof callback) === 'function') {
        callback(line_item, form);
      } else {
        ShopifyAPI.getCart(ShopifyAPI.onItemAdded);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      if ((typeof errorCallback) === 'function') {
        errorCallback(XMLHttpRequest, textStatus);
      }
      else {
        ShopifyAPI.onError(XMLHttpRequest, textStatus);
      }
    }
  };
  jQuery.ajax(params);
};

ShopifyAPI.addItemFromId = function(updates, callback, errorCallback) {
  // updates in the format: {794864053: 2, 794864233: 3}
  if ((typeof updates) != 'object') {
    return
  }
  var params = {
    type: 'POST',
    url: '/cart/update.js',
    data: {updates: updates},
    dataType: 'json',
    success: function(line_item) {
      if ((typeof callback) === 'function') {
        callback(line_item);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      if ((typeof errorCallback) === 'function') {
        errorCallback(XMLHttpRequest, textStatus);
      } else {
        ShopifyAPI.onError(XMLHttpRequest, textStatus);
      }
    }
  };
  jQuery.ajax(params);
};

ShopifyAPI.addItem = function(id, qty, properties, callback) {
  // data in the format: { quantity: 1, id: 794864229, properties: { 'First name' : 'Caroline' }}
  var params = {
    quantity: qty,
    id: id
  };
  if(properties != false){
    params.properties = properties;
  }
  $.ajax({
    type: 'POST',
    url: '/cart/add.js',
    dataType: 'json',
    data: params,
    success: function(line_item) {
      if ((typeof callback) === 'function') {
        ShopifyAPI.getCart(callback);
      } else {
        ShopifyAPI.getCart(ShopifyAPI.onItemAdded);
      }
      console.log('added');
    },
    error: function(XMLHttpRequest, textStatus) {
      if ((typeof errorCallback) === 'function') {
        errorCallback(XMLHttpRequest, textStatus);
      } else {
        ShopifyAPI.onError(XMLHttpRequest, textStatus);
      }
    }
  });
};

// Get from cart.js returns the cart in JSON
ShopifyAPI.getCart = function(callback) {
  $.getJSON('/cart.js', function (cart, textStatus) {
    if ((typeof callback) === 'function') {
      callback(cart, textStatus);
    } else {
      return cart;
    }
  });
};

// POST to cart/change.js returns the cart in JSON
ShopifyAPI.changeItem = function(line, quantity, callback) {
  var params = {
    type: 'POST',
    url: '/cart/change.js',
    data: 'quantity=' + quantity + '&line=' + line,
    dataType: 'json',
    success: function(cart) {
      if ((typeof callback) === 'function') {
        callback(cart);
      }
      else {
        ShopifyAPI.onCartUpdate(cart);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      ShopifyAPI.onError(XMLHttpRequest, textStatus);
    }
  };
  jQuery.ajax(params);
};

/*================ Sections ================*/
/*===============================================
* product.js
* ================================================*/
/**
 * Product Template Script
 * ------------------------------------------------------------------------------
 * A file that contains scripts highly couple code to the Product template.
 *
 * @namespace product
 */

theme.Product = (function() {

  var selectors = {
    addToCart: '[data-add-to-cart]',
    addToCartText: '[data-add-to-cart-text]',
    comparePrice: '[data-compare-price]',
    comparePriceText: '[data-compare-text]',
    originalSelectorId: '[data-product-select]',
    priceWrapper: '[data-price-wrapper]',
    productFeaturedImage: '[data-product-featured-image]',
    productJson: '[data-product-json]',
    productPrice: '[data-product-price]',
    productThumbs: '[data-product-single-thumbnail]',
    singleOptionSelector: '[data-single-option-selector]'
  };

  /**
   * Product section constructor. Runs on page load as well as Theme Editor
   * `section:load` events.
   * @param {string} container - selector for the section container DOM element
   */
  function Product(container) {
    this.$container = $(container);

    // Stop parsing if we don't have the product json script tag when loading
    // section in the Theme Editor
    if (!$(selectors.productJson, this.$container).html()) {
      return;
    }

    var sectionId = this.$container.attr('data-section-id');
    this.productSingleObject = JSON.parse($(selectors.productJson, this.$container).html());

    var options = {
      $container: this.$container,
      enableHistoryState: this.$container.data('enable-history-state') || false,
      singleOptionSelector: selectors.singleOptionSelector,
      originalSelectorId: selectors.originalSelectorId,
      product: this.productSingleObject
    };

    this.settings = {};
    this.namespace = '.product';
    this.variants = new slate.Variants(options);
    this.$featuredImage = $(selectors.productFeaturedImage, this.$container);

    this.$container.on('variantChange' + this.namespace, this.updateAddToCartState.bind(this));
    this.$container.on('variantPriceChange' + this.namespace, this.updateProductPrices.bind(this));

    if (this.$featuredImage.length > 0) {
      this.settings.imageSize = slate.Image.imageSize(this.$featuredImage.attr('src'));
      slate.Image.preload(this.productSingleObject.images, this.settings.imageSize);

      this.$container.on('variantImageChange' + this.namespace, this.updateProductImage.bind(this));
    }
  }

  Product.prototype = $.extend({}, Product.prototype, {

    /**
     * Updates the DOM state of the add to cart button
     *
     * @param {boolean} enabled - Decides whether cart is enabled or disabled
     * @param {string} text - Updates the text notification content of the cart
     */
    updateAddToCartState: function(evt) {
      var variant = evt.variant;

      if (variant) {
        $(selectors.priceWrapper, this.$container).removeClass('hide');
      } else {
        $(selectors.addToCart, this.$container).prop('disabled', true);
        $(selectors.addToCartText, this.$container).html(theme.strings.unavailable);
        $(selectors.priceWrapper, this.$container).addClass('hide');
        return;
      }

      if (variant.available) {
        $(selectors.addToCart, this.$container).prop('disabled', false);
        $(selectors.addToCartText, this.$container).html(theme.strings.addToCart);
      } else {
        $(selectors.addToCart, this.$container).prop('disabled', true);
        $(selectors.addToCartText, this.$container).html(theme.strings.soldOut);
      }
    },

    /**
     * Updates the DOM with specified prices
     *
     * @param {string} productPrice - The current price of the product
     * @param {string} comparePrice - The original price of the product
     */
    updateProductPrices: function(evt) {
      var variant = evt.variant;
      var $comparePrice = $(selectors.comparePrice, this.$container);
      var $compareEls = $comparePrice.add(selectors.comparePriceText, this.$container);

      $(selectors.productPrice, this.$container)
          .html(slate.Currency.formatMoney(variant.price, theme.moneyFormat));

      if (variant.compare_at_price > variant.price) {
        $comparePrice.html(slate.Currency.formatMoney(variant.compare_at_price, theme.moneyFormat));
        $compareEls.removeClass('hide');
      } else {
        $comparePrice.html('');
        $compareEls.addClass('hide');
      }
    },

    /**
     * Updates the DOM with the specified image URL
     *
     * @param {string} src - Image src URL
     */
    updateProductImage: function(evt) {
      var variant = evt.variant;
      var sizedImgUrl = slate.Image.getSizedImageUrl(variant.featured_image.src, this.settings.imageSize);

      this.$featuredImage.attr('src', sizedImgUrl);
    },

    /**
     * Event callback for Theme Editor `section:unload` event
     */
    onUnload: function() {
      this.$container.off(this.namespace);
    }
  });

  return Product;
})();

theme.Product.custom = {
  checkProductVariantsInCart: function(){
    $.getJSON('/cart.js', function (cart) {
      let arr_id = [],
          arr_qty =[];
      for (var j = 0; cart.items.length > j; j++) {
        arr_id.push(cart.items[j].id);
        arr_qty.push(cart.items[j].quantity);
      }

      $('.product-section__product-info .product-variant').each(function () {
        let product_variant = $(this),
            product_variant_id = product_variant.data('variant-id') * 1;
        //check = $(product_variant).prev('button');

        if(product_variant.hasClass('active')){

          if(arr_id.indexOf(product_variant_id) >= 0){
            let count = arr_qty[arr_id.indexOf(product_variant_id)];
            product_variant.data("qty", count);
            $('.product-section__product-info button.product-content-add').addClass('hide');
            $('.product-section__product-info .product-content-count').removeClass('hide').find('.product-count').text(count);
          }else{
            product_variant.data("qty", 0);
            let block = $('.product-section__product-info .product-add-container');
            $(block).find('.product-content-add').removeClass('hide');
            $(block).find('.product-content-count').addClass('hide').find('.product-count').text(0);
          }
        }else{
          if(arr_id.indexOf(product_variant_id) >= 0){
            let count = arr_qty[arr_id.indexOf(product_variant_id)];
            product_variant.data("qty", count);
          }else{
            product_variant.data("qty", 0);
          }
        }
      });
    });
  }
};

/*===============================================
* meal-pack-products.js
* ================================================*/
theme.mealPackProducts = {

  mealPackTest: function() {
    $('.packs-or-program .btn-meals-pack-quiz').click(function(){
        let content = $(this).data('action');
        if(content == 'program'){
            $('.test-content').addClass('hide');
            $('.wm-360-buy-meals-pack').removeClass('hide');
            $('.packs-or-program').addClass('hide');
            $('.test-meal-pack').css('padding-bottom', '0px');
            $('.to-chose-category-wm360').removeClass('hide');
        }else{
            $('.wm-360-buy-meals-pack').addClass('hide');
            $('.test-content').removeClass('hide');
            $('.packs-or-program').addClass('hide');
            $('.test-meal-pack').css('padding-bottom', '56px');
        }
    });

    $('.quiz-go-back').click(function(el){
      $('html, body').animate({
        scrollTop: $(".meals-pack-goal-main-header").offset().top - 100
      }, 1000);
      let button = $(this)[0];
      if($(button).hasClass('to-chose-category-wm360')){
        $('.meals-program-on-collection .quiz-go-back').addClass('hide');
        $('.test-content').addClass('hide');
        $('.packs-or-program').removeClass('hide');
        $('.wm-360-buy-meals-pack').addClass('hide');
      }else if($(button).hasClass('to-chose-category')){
        $('.test-content').addClass('hide');
        $('.packs-or-program').removeClass('hide')
      }else if($(button).hasClass('to-gender')){
        $(button).addClass('hide').removeClass('to-gender');
        $('.test-content-activity').fadeOut("slow", function() {
          $('.test-content-gender').fadeIn("slow");
        });
        $('.question-number div:first-child').removeClass('active');
        $('.test-content .question-text').text('Are you male or female?');
      }else if($(button).hasClass('to-activity')){
        $('.test-content-gender').css({'display': 'none'});
        $('.test-content-days').fadeOut("slow", function() {
          $('.test-content-activity').fadeIn("fast");
          $('.test-content-gender').css({'display': 'none'});
          $('.test-content .question-text').text('What best describes your activity level?');
          $(button).removeClass('to-activity').addClass('to-gender');
          window.history.pushState("/products/", "Collection Meals Pack", "/collections/"+ $('.meals-pack-goal-main-header').data('collection'));
        });
        $('.question-number div:last-child').removeClass('active');
        $('.question-number div:nth-child(2)').removeClass('active');
        $('.meal-pack-products').fadeOut("slow");
        $('.btn-days').removeClass('active');
        $('.test-result').addClass('hide');
        $('.test-result-gender .icon').css({'display': 'none'});
      }
    });

    $('.btn-gender').click(function () {
      let content = $(this).data('gender');
      $('.question-content').data('gender', content);
      $('.test-content-gender').fadeOut("slow", function() {
        $('.test-content-activity').fadeIn("slow");
      });
      $('.question-number div:first-child').addClass('active');
      $('.test-content .question-text').text('What best describes your activity level?');
      $('.quiz-go-back').removeClass('hide').addClass('to-gender');
    });

    $('input[name="test-activity"]').click(function () {
      let content = $('input[name="test-activity"]:checked').val();
      $('.question-content').data('activity', content);
      $('.test-content-activity').fadeOut("slow", function () {
        $('.test-content-days').fadeIn("slow");
      });
      $('.question-number div:nth-child(2)').addClass('active');
      $('.test-content .question-text').html('How many days do you want us to <br>make your meals for?');
      $('button.quiz-go-back').removeClass('to-gender').addClass('to-activity');

      let gender = $('.question-content').data('gender');
      setMealPackPrices(gender, content);
    });

    function setMealPackPrices(gender, activity){
      let packs = meal_packs_test_answers[gender][activity];
      for(let i = 0; packs.length> i; i++){
        let text_key = Object.keys(packs[i])[0],
            new_price = packs[i][text_key][0],
            discount_type = packs[i][text_key][2],
            regular_price = packs[i][text_key][3],
            meals_count = packs[i][text_key][1];

        $($('.btn-days .meals-count')[i]).text(meals_count + " MEALS");
        $($('.btn-days .pack-price .price_old')[i]).text('$'+regular_price);
        $($('.btn-days .pack-price .subscription-price')[i]).text('$'+new_price);
        $($('.btn-days .meal-price span')[i]).text("$"+(new_price/meals_count).toFixed(2));

      }

      $('.btn-days .pack-price').each(function () {
        let block = $(this),
            price_old = block.find('.price_old').text().slice(1),
            subscription_price = block.find('.subscription-price').text().slice(1);

        if(price_old*1 == subscription_price*1){
          block.find('.price_old').addClass('hide');
        }else{
          block.find('.price_old').removeClass('hide');
        }
      })
    }
  },

  mealPackTestResult: function () {
    $('.test-meal-pack .btn-days').click(function () {
      $('.btn-days').removeClass('active');
      $('.question-number div:last-child').addClass('active');
      $(this).addClass('active');

      let gender = $('.question-content').data('gender'),
          activity = $('.question-content').data('activity'),
          days = $(this).data('days');

      showResult(gender, activity, days);
    });

    function showResult(gender, activity, days) {
      if(activity.indexOf('_') != -1){
        activity =  activity.replace('_', ' ');
      }
      $('.test-meal-pack').css('padding-bottom', '56px');
      let result_block = $('.test-result');
      result_block.find('.test-result-gender span').text(gender);
      result_block.find('.icon-dumbbell-'+gender).css({'display': 'block'});
      result_block.find('.test-result-activity span').text(activity);
      result_block.find('.test-result-days span').text(days);
      result_block.removeClass('hide');

      $('html, body').animate({
        scrollTop: result_block.offset().top
      }, 1000);
    }
  },

  mealPackChangeProduct: function (products) {

    createProductsVariants(products);

    let allergens_icons ={
          kc_al_gluten : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-wheat" viewBox="0 0 18 25"><path d="M14.955.066a.49.49 0 0 1 .18.67l-.583 1.01c.282.352.415.863.38 1.488-.041.741-.316 1.587-.775 2.381-.252.437-.54.826-.844 1.154.341-.085.673-.129.985-.129.594 0 1.075.165 1.393.47l1.22-.644a.493.493 0 0 1 .459.87l-1.27.67c.06.972-.816 2.172-2.289 3.023a6.56 6.56 0 0 1-.887.43 1 1 0 0 1 .177.14l1.219-.644a.49.49 0 1 1 .458.869l-1.267.67c.026.413-.119.875-.429 1.35-.405.62-1.067 1.215-1.861 1.674a7.07 7.07 0 0 1-.684.345.514.514 0 0 1 .068.057l1.22-.643a.49.49 0 1 1 .459.868l-1.27.671c.026.414-.119.875-.428 1.35-.406.62-1.067 1.215-1.862 1.674-.783.452-1.601.721-2.33.77l-.24.01c-.763 0-1.34-.272-1.624-.764a1.34 1.34 0 0 1-.15-.391l-2.547 4.388a.68.68 0 0 1-.427.305.675.675 0 0 1-.508-.081.68.68 0 0 1-.224-.935l2.486-4.156-.125.006c-1.189 0-2.084-1.566-2.084-3.641 0-1.7.601-3.059 1.472-3.494l-.054-1.434a.492.492 0 0 1 .983-.038l.052 1.377.085.027a6.412 6.412 0 0 1-.043-.76c0-1.703.602-3.061 1.473-3.496l-.054-1.432a.49.49 0 1 1 .982-.037l.052 1.376c.071.02.14.046.209.078a6.488 6.488 0 0 1-.07-.976c0-1.702.601-3.061 1.472-3.495l-.054-1.434a.491.491 0 1 1 .982-.037l.053 1.377c.662.191 1.199.89 1.486 1.88a6.26 6.26 0 0 1 .57-1.302c.762-1.319 1.834-2.195 2.775-2.284l.156-.007c.076 0 .15.005.221.016l.585-1.01a.491.491 0 0 1 .671-.18zM9.212 16.432c-.608 0-1.366.237-2.08.649-1.405.811-1.976 1.893-1.752 2.283.089.15.315.246.633.267l.142.005c.607 0 1.364-.236 2.078-.648.654-.377 1.211-.874 1.53-1.361.25-.383.334-.728.222-.922-.1-.173-.382-.273-.773-.273zm-6.177-3.74c-.45 0-1.101 1.036-1.101 2.659 0 1.623.651 2.658 1.1 2.658.45 0 1.102-1.035 1.102-2.658-.001-1.623-.653-2.658-1.101-2.658zm3.844 2.47l-.853 1.468a6.72 6.72 0 0 1 1.299-.745 1.26 1.26 0 0 1-.3-.35 1.378 1.378 0 0 1-.146-.372zm-1.803-.571l.012.111a6.84 6.84 0 0 1 .02 1.028l.645-1.08a1.278 1.278 0 0 1-.677-.06zm6.63-2.48c-.608 0-1.364.236-2.078.648-.654.377-1.212.874-1.53 1.36-.251.384-.334.729-.222.923.088.151.314.246.632.268l.142.004c.608 0 1.365-.236 2.079-.647.653-.378 1.21-.873 1.53-1.361.25-.384.334-.729.222-.922-.101-.174-.383-.273-.774-.273zM5.53 8.37c-.448 0-1.1 1.035-1.1 2.658 0 1.624.652 2.659 1.1 2.659.45 0 1.102-1.035 1.102-2.659 0-1.623-.653-2.658-1.102-2.658zm3.946 2.322l-.932 1.602a6.598 6.598 0 0 1 1.48-.815 1.309 1.309 0 0 1-.548-.787zm-1.932-.64l.018.12a6.927 6.927 0 0 1 .032 1.401l.856-1.432a1.34 1.34 0 0 1-.906-.09zm6.755-2.429c-.608 0-1.366.236-2.08.647-.653.378-1.21.874-1.53 1.361-.25.384-.333.73-.221.922.087.152.314.247.632.269l.142.004c.608 0 1.365-.236 2.079-.648 1.405-.812 1.976-1.894 1.752-2.282-.101-.174-.383-.273-.774-.273zM8.12 3.884c-.448 0-1.1 1.034-1.1 2.658 0 1.623.652 2.658 1.1 2.658.449 0 1.102-1.035 1.102-2.658S8.569 3.883 8.12 3.883zm2.03 3.512c-.029.24-.072.468-.127.684.085.003.17.028.25.075l.016.01c.08.052.144.12.19.197.163-.164.346-.322.542-.472a1.3 1.3 0 0 1-.488-.164 1.344 1.344 0 0 1-.382-.33zm3.328-5.174c-.505 0-1.404.631-2.078 1.8-.378.654-.613 1.363-.645 1.944-.026.458.075.798.269.91.412.238 1.5-.395 2.283-1.75.377-.655.612-1.364.644-1.945.025-.457-.075-.797-.27-.91a.394.394 0 0 0-.203-.049z"></path></svg>',
          kc_al_peanuts : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-peanuts" viewBox="0 0 25 20"><path d="M9.371 8.662a.683.683 0 0 1-.851.46 5.332 5.332 0 0 1-3.677-3.923.685.685 0 1 1 1.334-.305c.105.457.348 1.133.91 1.762a3.976 3.976 0 0 0 1.825 1.155c.362.108.567.49.459.851m8.747-.878a7.666 7.666 0 0 1-1.958 2.896 7.606 7.606 0 0 1-2.19 1.409.686.686 0 0 1-.535-1.261 6.237 6.237 0 0 0 1.8-1.154 6.323 6.323 0 0 0 1.605-2.377.683.683 0 1 1 1.278.487m4.258 3.61c-1.275 2.992-4.12 5.447-7.247 6.254-.974.252-2.435.436-3.883-.097-1.308-.483-2.366-1.623-2.696-2.904a3.136 3.136 0 0 1-.044-1.401l.002-.006a3.08 3.08 0 0 1 .713-1.394c.612-.705 1.473-1.031 2.385-1.378.3-.114.6-.228.894-.356a6.808 6.808 0 0 0 1.189-.639l.027-.018.052-.037c1.038-.74 1.675-1.787 2.373-3.03.53-.95 1.078-1.93 1.878-2.562.705-.556 1.445-.715 2.205-.464 1.12.368 2.172 1.607 2.555 3.012.432 1.578.285 3.409-.403 5.02M8.188 10.95c-.349.401-.616.84-.802 1.3-1.723-.633-3.215-1.715-4.246-3.096C2.01 7.63 1.48 5.105 1.912 3.276c.256-1.084 1.02-1.793 2.041-1.895 1.086-.112 2.095.493 2.576 1.534.103.222.194.45.284.678.2.5.406 1.016.725 1.5.76 1.154 1.895 1.848 2.992 2.52.602.368 1.181.723 1.67 1.135-.077.036-.157.073-.241.11-.276.118-.558.224-.838.331-1.03.391-2.096.795-2.933 1.76m15.91-4.936c-.504-1.85-1.89-3.439-3.446-3.95-.837-.278-2.124-.381-3.48.69-1.014.802-1.63 1.902-2.253 3.016-.483.862-.942 1.633-1.54 2.2-.64-.608-1.398-1.071-2.134-1.521-1.014-.622-1.973-1.209-2.565-2.11-.243-.365-.415-.796-.597-1.252-.1-.248-.198-.498-.311-.743C7.042.762 5.49-.147 3.815.02 2.21.183.972 1.31.58 2.963.058 5.179.672 8.126 2.043 9.97c1.225 1.64 2.999 2.91 5.043 3.625-.026.456.02.922.14 1.392.437 1.704 1.83 3.213 3.546 3.848a7.19 7.19 0 0 0 2.487.427c.718 0 1.46-.095 2.212-.29 3.522-.91 6.727-3.673 8.164-7.04.817-1.918.982-4.02.464-5.919"></path></svg>',
          kc_al_treenuts : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-treenuts" viewBox="0 0 20 24"><path d="M9.902 0c.292 0 .536.244.536.537v1.829c4.537.268 8.342 3.732 8.951 8.293.05.463-.097.926-.365 1.268-.22.268-.513.439-.83.512v4.902c0 2.513-1.853 4.757-4.61 5.586l-3.512 1.049c-.048.024-.097.024-.146.024H9.86a.274.274 0 0 1-.105-.024c-.756-.22-1.536-.464-2.317-.708l-1.22-.366c-2.755-.829-4.585-3.073-4.585-5.56 0-1.269.025-2.513.025-3.781v-1.098a1.557 1.557 0 0 1-.854-.512 1.512 1.512 0 0 1-.39-1.268c.61-4.561 4.415-8.024 8.951-8.293V.537c0-.293.244-.537.537-.537zm7.146 12.512H2.731v1.073c-.024 1.244-.024 2.513-.024 3.756 0 2 1.536 3.805 3.804 4.513l1.22.366c.732.219 1.439.439 2.17.658l3.342-1c2.293-.707 3.83-2.512 3.83-4.537h-.025v-4.829zM9.878 3.44c-4.22 0-7.83 3.17-8.415 7.366a.523.523 0 0 0 .122.415c.097.121.244.17.39.17H17.78c.17 0 .292-.049.39-.17a.556.556 0 0 0 .122-.44c-.561-4.17-4.17-7.341-8.415-7.341zm4.243 6.122a.56.56 0 1 1 0 1.122.56.56 0 0 1 0-1.122zm1.854-2.049a.56.56 0 1 1-.001 0zm-3.146-.927a.56.56 0 1 1-.001 0z"></path></svg>',
          kc_al_eggs : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-egg" viewBox="0 0 19 24"><path d="M6.062 8.608a16.231 16.231 0 0 0-1.023 5.605.68.68 0 1 1-1.359 0c0-2.028.384-4.13 1.108-6.078a.679.679 0 1 1 1.273.473m2.021-3.68c-.32.406-.622.848-.897 1.313a.68.68 0 0 1-1.17-.691c.306-.518.643-1.01 1.002-1.464a.677.677 0 0 1 .953-.112.677.677 0 0 1 .112.954m1.731 17.714c-4.639 0-7.757-3.724-7.757-9.264 0-6.178 3.77-12.02 7.757-12.02 3.989 0 7.758 5.842 7.758 12.02 0 5.54-3.117 9.264-7.758 9.264M9.813 0C4.597 0 .7 7.063.7 13.378.699 19.632 4.446 24 9.813 24c5.369 0 9.116-4.368 9.116-10.622C18.929 7.063 15.03 0 9.813 0"></path></svg>',
          kc_al_dairy : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-milk" viewBox="0 0 18 24"><path d="M14.811 22.642H9.968V10.229h6.373v10.883c0 .843-.687 1.53-1.53 1.53zm-12.574-1.53V10.23h6.371v12.413H3.767c-.844 0-1.53-.687-1.53-1.53zM5.778 4.638h6.08L8.933 8.87h-6.08l2.925-4.232zm.325-1.36h6.373v-1.92H6.103v1.92zm9.622 5.592h-5.141l2.57-3.717 2.57 3.717zm1.974.59a.496.496 0 0 0-.084-.243l-3.78-5.471V.679A.68.68 0 0 0 13.154 0H5.423a.68.68 0 0 0-.68.68v3.066L1 9.163c-.01.014-.008.032-.016.045a.663.663 0 0 0-.087.252c-.003.022-.012.043-.013.065 0 .008-.006.016-.006.025v11.562A2.89 2.89 0 0 0 3.767 24H14.81a2.891 2.891 0 0 0 2.888-2.888V9.46z"></path></svg>',
          kc_al_sesame : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-sesame" viewBox="0 0 21 24"><path d="M6.067 14.711a.479.479 0 0 1 .424 0c.033.017.819.412 1.594 1.343.707.848 1.55 2.33 1.55 4.57 0 1.295-.336 2.19-1.025 2.735-.694.55-1.61.62-2.331.62-.72 0-1.637-.07-2.332-.62-.689-.546-1.024-1.44-1.024-2.735 0-2.24.843-3.722 1.55-4.57.775-.93 1.56-1.326 1.594-1.343zm.212.984a4.99 4.99 0 0 0-1.1 1.005c-.863 1.053-1.3 2.373-1.3 3.924 0 .984.216 1.633.661 1.986.362.286.898.414 1.739.414.84 0 1.377-.128 1.739-.414.445-.353.661-1.002.661-1.986 0-1.55-.437-2.87-1.3-3.924a4.99 4.99 0 0 0-1.1-1.005zm5.718-4.088c.035-.012.87-.288 2.077-.178 1.1.1 2.743.553 4.327 2.136.915.916 1.311 1.785 1.21 2.658-.103.88-.7 1.578-1.21 2.088-.51.509-1.208 1.107-2.087 1.21-.09.01-.178.015-.267.015-.784 0-1.57-.403-2.392-1.225-1.583-1.584-2.035-3.228-2.135-4.328-.11-1.206.165-2.041.177-2.076a.48.48 0 0 1 .3-.3zm5.728 2.633c-2.18-2.179-4.452-1.94-5.182-1.788-.06.29-.134.823-.068 1.49.135 1.354.76 2.597 1.856 3.693.695.696 1.308 1.002 1.872.937.458-.054.928-.343 1.522-.937.594-.594.883-1.064.937-1.522.065-.564-.241-1.177-.937-1.873zm-1.002 2.384a.478.478 0 0 1 .675.676c-.212.212-.541.508-.952.635a.478.478 0 0 1-.281-.913c.158-.049.335-.175.558-.398zm-2.1 0a.48.48 0 0 1 .676 0c.027.028.054.054.08.078a.477.477 0 1 1-.648.702l-.108-.104a.48.48 0 0 1 0-.676zM4.108 5.104c2.24 0 3.72.843 4.57 1.55.93.775 1.326 1.561 1.342 1.594a.472.472 0 0 1 0 .424c-.016.033-.412.82-1.342 1.594-.85.707-2.33 1.55-4.57 1.55-1.295 0-2.19-.335-2.736-1.024-.55-.695-.62-1.611-.62-2.332 0-.72.07-1.637.62-2.331.546-.69 1.44-1.024 2.736-1.024zm0 .956c-.984 0-1.634.216-1.986.662-.287.361-.414.898-.414 1.738s.127 1.377.414 1.739c.352.445 1.002.661 1.986.661 1.55 0 2.87-.437 3.924-1.3a5.004 5.004 0 0 0 1.004-1.1 5.027 5.027 0 0 0-1.004-1.1c-1.054-.863-2.374-1.3-3.924-1.3zM15.576.016c.873-.102 1.742.294 2.658 1.21 1.583 1.583 2.035 3.227 2.136 4.327.11 1.206-.166 2.041-.178 2.076a.48.48 0 0 1-.3.3c-.03.01-.616.203-1.51.203-.177 0-.367-.007-.566-.025-1.1-.1-2.744-.553-4.328-2.136-.915-.916-1.311-1.785-1.21-2.658.103-.88.7-1.578 1.21-2.087.51-.51 1.208-1.108 2.088-1.21zm.26.94c-.05 0-.1.003-.15.009-.458.053-.928.342-1.522.936-.594.594-.883 1.064-.937 1.522-.065.564.241 1.177.937 1.873 1.096 1.096 2.339 1.72 3.693 1.855a5.04 5.04 0 0 0 1.49-.068c.059-.29.133-.823.067-1.488-.135-1.355-.76-2.598-1.856-3.694-.634-.634-1.2-.945-1.722-.945z"></path></svg>',
          kc_al_soy : '<svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-soy" viewBox="0 0 25 24"><path d="M17.742 0l.252.002c1.522.032 4.374.935 4.868 1.095l.07.022a.547.547 0 0 1 .347.347c.045.135 1.084 3.306 1.118 4.941a6.553 6.553 0 0 1-4.275 6.275c-.727.27-1.313.868-1.61 1.644a6.557 6.557 0 0 1-3.788 3.789c-.775.295-1.374.881-1.643 1.608A6.556 6.556 0 0 1 6.943 24c-.047 0-.092 0-.14-.002-1.636-.034-4.794-1.085-4.927-1.13a.548.548 0 0 1-.346-.344C1.486 22.39.434 19.23.4 17.594a6.554 6.554 0 0 1 4.275-6.275c.728-.27 1.314-.869 1.61-1.644a6.564 6.564 0 0 1 3.788-3.79c.776-.295 1.374-.88 1.644-1.608.97-2.616 3.494-4.348 6.277-4.275zm.228 1.092c-2.3-.07-4.422 1.384-5.23 3.564-.379 1.022-1.21 1.841-2.28 2.249a5.472 5.472 0 0 0-3.157 3.158c-.407 1.07-1.227 1.9-2.249 2.278a5.464 5.464 0 0 0-3.564 5.23c.026 1.221.742 3.566.99 4.347.781.249 3.126.964 4.347.99 2.324.077 4.422-1.383 5.23-3.564.379-1.022 1.21-1.842 2.28-2.25a5.467 5.467 0 0 0 3.157-3.157c.407-1.07 1.227-1.9 2.249-2.278a5.463 5.463 0 0 0 3.563-5.23c-.025-1.221-.732-3.572-.979-4.358-.786-.247-3.136-.953-4.357-.979zM6.944 14.182a3.276 3.276 0 0 1 3.273 3.272 3.276 3.276 0 0 1-3.273 3.273 3.276 3.276 0 0 1-3.273-3.273 3.276 3.276 0 0 1 3.273-3.272zm0 1.09c-1.203 0-2.182.98-2.182 2.182 0 1.204.98 2.182 2.182 2.182a2.184 2.184 0 0 0 2.182-2.182c0-1.203-.98-2.181-2.182-2.181zm5.454-6.545A3.276 3.276 0 0 1 15.671 12a3.276 3.276 0 0 1-3.273 3.273A3.276 3.276 0 0 1 9.126 12a3.276 3.276 0 0 1 3.272-3.273zm0 1.091A2.184 2.184 0 0 0 10.217 12c0 1.203.979 2.182 2.181 2.182A2.185 2.185 0 0 0 14.58 12a2.185 2.185 0 0 0-2.182-2.182zm5.455-6.545a3.276 3.276 0 0 1 3.273 3.272 3.276 3.276 0 0 1-3.273 3.273 3.276 3.276 0 0 1-3.273-3.273 3.276 3.276 0 0 1 3.273-3.272zm0 1.09a2.185 2.185 0 0 0-2.182 2.182c0 1.204.98 2.182 2.182 2.182a2.184 2.184 0 0 0 2.182-2.182c0-1.203-.98-2.181-2.182-2.181z"></path></svg>'
        },
        product_types ={
          wm_black_label : 'Black Label',
          wm_low_carb : 'Low Carb',
          wm_breakfast : 'Breakfast',
          wm_clean_meals : 'Clean',
          wm_clean_vegan : 'Vegan',
        };

    function createProductsVariants(products){
      let all_products_variants = [];
      for (let i = 0; products.length> i; i++){
        let product = products[i],
            product_v_img = product.images[0],
            product_v_title = product.title,
            product_v_allergens = [],
            discount_type = $('.days-meal-plan.meal-pack-has-discount').data('discount-type'),
            discount_value = $('.days-meal-plan.meal-pack-has-discount').data('discount')*1,
            product_variant_price;

        for(let k=0; product.tags.length > k; k++){
          if(product.tags[k].indexOf('kc_al_') != -1 ){
            product_v_allergens.push(product.tags[k]);
          }
        }

        for (let j = 0; product.variants.length > j; j++) {
          let product_v_size = '';
          if(product.variants[j].title != 'Default Title'){
            product_v_size += product.variants[j].title;
          }

          if(discount_type == "PERCENT" && discount_value > 0){
            product_variant_price = (product.variants[j].price*1 - (product.variants[j].price*discount_value/100)).toFixed(2);
          }else{
            product_variant_price = product.variants[j].price;
          }

          let product_v_obj = {
            'product_v_img': product_v_img,
            'product_v_title': product_v_title,
            'product_v_size': product_v_size,
            'product_v_id': product.variants[j].apiId,
            'product_v_price': product_variant_price,
            'product_v_regular_price': product.variants[j].price,
            'product_v_nutritions': product.variants[j].nutritions,
            'product_v_calories': product.variants[j].nutritions.Calories,
            'product_v_weight': product.variants[j].totalWeight,
            'product_v_tags': product.tags,
            'product_v_allergens': product_v_allergens
          };

          all_products_variants.push(product_v_obj);
        }
      }

      compareProductsCalories(all_products_variants);
      addProductsToEmpty(all_products_variants);
    }

    function compareProductsCaloriesProcess(products, button) {
      $('.pop-up-change-meal-tabs span').removeClass('active');
      $('.pop-up-change-meal-tabs span:first-child').addClass('active');
      $('.pop-up-change-meal h3').addClass('hide');
      $('.collection-meals-block').empty();
      $('.pop-up-change-meal').addClass('change-meal');
      $('body').addClass('active-pop-up');
      $('.meal').removeClass('product-to-change');
      button.parent().parent().addClass('product-to-change');

      let calories_max =  button.data('find-calories')*1 + 50,
          calories_min =  button.data('find-calories')*1 - 50,
          meal_number =  button.data('meal-number'),
          products_for_pop_up = [],
          meal_block =  button.parent().parent(),
          special_meal = meal_block.data('special'),
          first_price = meal_block.attr('data-variant-price'),
          meal_changed_price = meal_block.attr('data-variant-price_discount');

      $('.pop-up-change-meal').attr('data-change-price', first_price);
      $('.pop-up-change-meal').attr('data-variant-price_discount', meal_changed_price);
      $('.pop-up-change-meal').removeClass('new-meal special-meal');

      if(special_meal){
        setProductsInPopUp(products, meal_number, special_meal, first_price, meal_changed_price);
      }else {
        if(! $('.checkbox-all-meals input').prop('checked')){
          for(let i = 0; products.length>i; i++ ){
            if( products[i].product_v_calories > calories_min && products[i].product_v_calories < calories_max ){
              products_for_pop_up.push(products[i]);
            }
          }
        }else{
          products_for_pop_up = products;
        }
        setProductsInPopUp(products_for_pop_up, meal_number, special_meal, first_price, meal_changed_price);
      }
    }

    function compareProductsCalories(products){
      $('.meal-pack-page').on('click', '.change-meal', function () {
        let button = $(this);
        compareProductsCaloriesProcess(products, button);

        $('.checkbox-all-meals input').change(function () {
          compareProductsCaloriesProcess(products, button);
        });

      })
    }

    function setProductsInPopUp(products, meal_number, special_meal, first_price, meal_changed_price) {

      if(special_meal){
        let products_set = [];
        for(let i = 0; products.length>i; i++){
          if(products[i].product_v_tags.indexOf(special_meal) != -1){
            products_set.push(products[i]);
          }
        }
        for(let i = 0; products_set.length>i; i++){
          createProductBlock(products_set[i], first_price, meal_changed_price);
        }
        $('.pop-up-change-meal').addClass('special-meal');
        $('.pop-up-change-meal-tabs').addClass('hide');
        $('.pop-up-change-meal .checkbox-all-meals').addClass('hide');
        $('.pop-up-change-meal h2').text('SELECT A '+special_meal);
      }else{
        $('.pop-up-change-meal-tabs').removeClass('hide');
        if(!$('.pop-up-change-meal').hasClass('new-meal')){
            $('.pop-up-change-meal .checkbox-all-meals').removeClass('hide');
        }else{
            $('.pop-up-change-meal .checkbox-all-meals').addClass('hide');
        }
        popUpFiltering(products);
        for(let i = 0; products.length>i; i++){
          createProductBlock(products[i], first_price, meal_changed_price);
        }
        $('.pop-up-change-meal h2').text('SELECT A MEAL FOR Meal '+meal_number);
      }

      $('.pop-up-change-meal').removeClass('hide');


      $('.collection-meals-block').scrollTop(0);
    }

    function popUpFiltering(all_products){
      let meal_changed_price = $('.change-meal').attr('data-variant-price_discount')*1;
      $('.change-meal .pop-up-change-meal-tabs option.special-tag').attr('disabled','true');

      $('.pop-up-change-meal-tabs span').click(function () {
        $('.pop-up-change-meal h3').addClass('hide');
        $('.pop-up-change-meal-tabs span').removeClass('active');
        $('.collection-meals-block').empty();
        $(this).addClass('active');
        let tag = $(this).data('tag'),
            first_price = $('.pop-up-change-meal').attr('data-change-price');
        filteringProducts(all_products, tag, first_price, meal_changed_price)
      });

      $('select.pop-up-change-meal-tabs').change(function () {
        $('.pop-up-change-meal h3').addClass('hide');
        $('.collection-meals-block').empty();
        let tag = $('select.pop-up-change-meal-tabs').val(),
            first_price = $('.pop-up-change-meal').attr('data-change-price');
        filteringProducts(all_products, tag, first_price, meal_changed_price);
      });
    }

    function filteringProducts(all_products, tag, first_price, meal_changed_price){
      let products_with_tag = [];
      if(tag == 'all'){
        products_with_tag = all_products.slice(0);
      }else{
        for(let i = 0; all_products.length>i; i++){
          let product = all_products[i];
          if(product.product_v_tags.indexOf(tag) != -1){
            products_with_tag.push(product);
          }
        }
      }

      if(products_with_tag.length == 0 ){
        $('.pop-up-change-meal h3').removeClass('hide');
      }else{
        $('.pop-up-change-meal h3').addClass('hide');
        for(let i = 0; products_with_tag.length>i; i++){
          createProductBlock(products_with_tag[i], first_price, meal_changed_price);
        }
      }
    }

    function createProductBlock(product, first_price, meal_changed_price) {
      let image_product = createSmallImage(product.product_v_img),
          allergens_block = '',
          block_price,
          product_type,
          product_d_price = product.product_v_price,
          data_discount = $('.meal-pack-has-discount').attr('data-discount'),
          units = 'g';

      if(product.product_v_tags.indexOf('juice') != -1) {
        units = 'ml';
      }

      if(product.product_v_tags.indexOf('wm_black_label') != -1){
        product_type = product_types.wm_black_label;
      }else if(product.product_v_tags.indexOf('wm_low_carb') != -1){
        product_type = product_types.wm_low_carb;
      }else if(product.product_v_tags.indexOf('wm_breakfast') != -1){
        product_type = product_types.wm_breakfast;
      }else if(product.product_v_tags.indexOf('wm_clean_meals') != -1){
        product_type = product_types.wm_clean_meals;
      }else if(product.product_v_tags.indexOf('wm_clean_vegan') != -1){
        product_type = product_types.wm_clean_vegan;
      }else if(product.product_v_tags.indexOf('snack') != -1){
        product_type = 'Snack';
      }else if(product.product_v_tags.indexOf('juice') != -1){
        product_type = 'Juice';
      }else{
        product_type = 'All';
      }

      if(meal_changed_price > 0){

        product_d_price = Math.round ((product.product_v_regular_price - (product.product_v_regular_price * data_discount/100))*100)/100;
        if(product_d_price){
          block_price = Math.round ((meal_changed_price - product_d_price)*100)/100;
        }else{
          block_price = Math.round ((meal_changed_price - product.product_v_regular_price)*100)/100;
        }

        if(block_price == 0){
          block_price = 'same price';
        }else{
          block_price > 0 ? block_price = '- $'+roundPrice(block_price) : block_price = '+ $'+roundPrice(block_price*(-1));
        }
      }else if(first_price > 0){
        block_price = Math.round ((first_price - product.product_v_price)*100)/100;
        if(block_price == 0){
          block_price = 'same price';
        }else{
          block_price > 0 ? block_price = '- $'+roundPrice(block_price) : block_price = '+ $'+roundPrice(block_price*(-1));
        }
      }else{
        block_price = '$'+ roundPrice(product.product_v_price);
      }

      for(let i=0; product.product_v_allergens.length>i; i++){
        let key = product.product_v_allergens[i];
        allergens_block += allergens_icons[key];
      }

      let product_block_nutrition = '<p><span class="to-day-protein">'+ product.product_v_nutritions.Protein +'</span>Protein (g)</p>\n' +
          '<p><span class="to-day-cal">'+ product.product_v_nutritions.Calories +'</span>Calories</p>\n' +
          '<p><span class="to-day-carbs">'+ product.product_v_nutritions.Carbohydrate +'</span>Carbs (g)</p>\n' +
          '<p><span class="to-day-fat">'+ product.product_v_nutritions.Fat_Total +'</span>Fat (g)</p>',

          product_block = '<div>' +
              '<div><img '+image_product+' alt="'+ product.product_v_title +' Workout Meals ™">' +
              '<p class="product-type">'+ product_type +'</p><div class="short-info"><p><span>'+ product.product_v_size +' </span>' +
              '<span> '+ product.product_v_weight +' ('+ units +')</span></p><p>'+ allergens_block +'</p></div></div>' +
              '<div><p class="title">' + product.product_v_title + '</p>' +
              '<div class="meal-nutrition">'+ product_block_nutrition +'</div>' +
              '<div class="select_button"><p>'+ block_price +'</p><button data-id="'+product.product_v_id+'" data-price="'+product_d_price+'" data-regular-price="'+product.product_v_regular_price+'">Select</button></div></div></div>';

      $('.collection-meals-block').append(product_block);
    }

    function roundPrice(price){
      let new_price = (price*1).toFixed(2);
      return new_price;
    }

    $('.collection-meals-block').on('click', 'button', function () {
      let main_pack_block = $(".meal-pack-page").find(".days-meal-plan"),
          discount_type = $(main_pack_block).data("discount-type"),
          discount_p = $(main_pack_block).data("discount")*1;

      let button = $(this),
          variant_id = button.data('id'),
          content_block = button.parent().parent(),
          full_block = button.parent().parent().parent(),
          variant_img = full_block.find('img').attr('srcset'),
          variant_title = content_block.find('.title').text(),
          nutrition = content_block.find('.meal-nutrition').contents().clone(),
          product_to_change = $('.meal').filter('.product-to-change'),
          old_price = product_to_change.attr('data-variant-price')*1,
          old_d_price = product_to_change.attr('data-variant-price_discount')*1,
          variant_price = button.attr('data-regular-price')*1,
          variant_price_new = button.attr('data-price')*1,
          old_sum = $('.meal-pack-page .add-to-cart-plan .new-pack-sum').text()*1,
          old_sum_old = $('.meal-pack-page .add-to-cart-plan .old-pack-sum').text()*1,
          day_nutrition = product_to_change.parent().prev('.day-nutrition'),
          cal_for_filter = product_to_change.find('.change-meal'),

          day_nutrition_protein = day_nutrition.find('.day-protein').text()*1,
          day_nutrition_fat = day_nutrition.find('.day-fat').text()*1,
          day_nutrition_carbs = day_nutrition.find('.day-carbs').text()*1,
          day_nutrition_cal = day_nutrition.find('.day-cal').text()*1,

          old_protein = product_to_change.find('.to-day-protein').text() *1,
          old_fat = product_to_change.find('.to-day-fat').text() *1,
          old_carbs = product_to_change.find('.to-day-carbs').text() *1,
          old_cal = product_to_change.find('.to-day-cal').text() *1,
          new_protein = nutrition.find('.to-day-protein').text() *1,
          new_fat = nutrition.find('.to-day-fat').text()*1,
          new_carbs = nutrition.find('.to-day-carbs').text()*1,
          new_cal = nutrition.find('.to-day-cal').text()*1;

      if(!old_d_price){
        old_d_price = 0;
      }

      if(!variant_price_new){
        variant_price_new = variant_price;
      }

      $(product_to_change).attr('data-variant-price_discount', variant_price_new);

      let full_protein = Math.round((day_nutrition_protein - old_protein + new_protein)*100)/100,
          full_fat = Math.round((day_nutrition_fat - old_fat + new_fat)*100)/100,
          full_carbs = Math.round((day_nutrition_carbs - old_carbs + new_carbs)*100)/100,
          full_cal = Math.round((day_nutrition_cal - old_cal + new_cal)*100)/100,
          full_new_price = Math.round((old_sum - old_d_price + variant_price_new)*100)/100,
          full_new_price_old = Math.round((old_sum_old - old_price + variant_price)*100)/100;

      day_nutrition.find('.day-protein').text(full_protein);
      day_nutrition.find('.day-fat').text(full_fat);
      day_nutrition.find('.day-carbs').text(full_carbs);
      day_nutrition.find('.day-cal').text(full_cal);
      $('.meal-pack-page .add-to-cart-plan .old-pack-sum').text(full_new_price_old);
      $('.meal-pack-page .add-to-cart-plan .new-pack-sum').text(full_new_price);

      product_to_change.find('.meal-title').text(variant_title);
      product_to_change.attr('data-variant', variant_id);
      $(product_to_change).attr('data-variant-price', variant_price);
      product_to_change.find('.meal-image').html('<img  srcset="' + variant_img + '" alt="'+ variant_title +'">');
      product_to_change.find('.meal-nutrition').html(nutrition);
      cal_for_filter.attr('data-find-calories', new_cal);

      if(product_to_change.hasClass('empty-meal')){
        product_to_change.find('.change-meal').removeClass('hide');
        product_to_change.find('.delete-meal').removeClass('hide');
        product_to_change.find('.meal-image').addClass('full-product');
        product_to_change.removeClass('empty-meal');
      }

      $('.pop-up-change-meal').addClass('hide').attr('data-change-price', '');
      $('body').removeClass('active-pop-up');
      $('.collection-meals-block').empty();
    });

    function createSmallImage(image){
      if(image){
        let img_small = image.replace('.jpg','_260x.jpg'),
            img_medium = image.replace('.jpg','_390x.jpg'),
            img_large = image.replace('.jpg','_520x.jpg'),
            full_img = 'srcset="'+ img_small +', '+ img_medium +' 1.5x, '+ img_large +' 2x" ' +
                'src="'+ img_small +'"';
        return full_img;
      }
    }

    $('.meal-pack-page').on('click','.delete-meal', function () {
      let main_pack_block = $(".meal-pack-page").find(".days-meal-plan"),
          discount_type = $(main_pack_block).data("discount-type"),
          discount_p = $(main_pack_block).data("discount")*1;

      let product = $(this).parent().parent(),
          product_price = $(product).attr('data-variant-price')*1,
          product_price_discount =  $(product).attr('data-variant-price_discount')*1,
          variant_title = 'Choose a '+ product.find('.meal-number').text(),
          nutrition = '<p><span class="to-day-protein">0</span>Protein (g)</p>\n' +
              '<p><span class="to-day-cal">0</span>Calories</p>\n' +
              '<p><span class="to-day-carbs">0</span>Carbs (g)</p>\n' +
              '<p><span class="to-day-fat">0</span>Fat (g)</p>',
          old_sum = $('.meal-pack-page .add-to-cart-plan .new-pack-sum').text()*1,
          old_full_price_old = $('.meal-pack-page .add-to-cart-plan .old-pack-sum').text()*1,
          day_nutrition = product.parent().prev('.day-nutrition'),
          day_nutrition_protein = day_nutrition.find('.day-protein').text()*1,
          day_nutrition_fat = day_nutrition.find('.day-fat').text()*1,
          day_nutrition_carbs = day_nutrition.find('.day-carbs').text()*1,
          day_nutrition_cal = day_nutrition.find('.day-cal').text()*1,

          old_protein = product.find('.to-day-protein').text() *1,
          old_fat = product.find('.to-day-fat').text() *1,
          old_carbs = product.find('.to-day-carbs').text() *1,
          old_cal = product.find('.to-day-cal').text() *1;

      let full_protein = Math.round((day_nutrition_protein - old_protein)*100)/100,
          full_fat = Math.round((day_nutrition_fat - old_fat)*100)/100,
          full_carbs = Math.round((day_nutrition_carbs - old_carbs)*100)/100,
          full_cal = Math.round((day_nutrition_cal - old_cal)*100)/100,
          full_new_price,
          old_full_price = Math.round((old_full_price_old - product_price)*100)/100;

      /*if(discount_type == "FIXED"){
                console.log('product');
                console.log(product_price);
                full_new_price = Math.round((old_sum - product_price)*100)/100;

            }else{
                console.log('new sum');
                let p_product_price = (product_price - (product_price*discount_p/100)).toFixed(2);
                full_new_price = Math.round((old_sum - p_product_price)*100)/100;
            }*/

      if(product_price_discount > 0){
        full_new_price =Math.round((old_sum - product_price_discount)*100)/100;
      }
/*
      console.log('old_sum = ', old_sum);
      console.log('full_new_price = ', full_new_price);*/

      day_nutrition.find('.day-protein').text(full_protein);
      day_nutrition.find('.day-fat').text(full_fat);
      day_nutrition.find('.day-carbs').text(full_carbs);
      day_nutrition.find('.day-cal').text(full_cal);

      $('.meal-pack-page .add-to-cart-plan .old-pack-sum').text(old_full_price);

      $('.meal-pack-page .add-to-cart-plan .new-pack-sum').text(full_new_price);

      product.find('.change-meal').addClass('hide');
      product.find('.delete-meal').addClass('hide');
      product.find('.meal-image').removeClass('full-product');
      product.addClass('empty-meal');
      product.find('.meal-nutrition').html(nutrition);

      product.find('.meal-title').text(variant_title);
      product.attr('data-variant', '');
      product.attr('data-variant-price', '0');
      product.attr('data-variant-price_discount', '0');
      product.find('.meal-image').empty();
    });

    function addProductsToEmpty(products){
      $('.meal-pack-page').on('click', '.empty-meal .meal-image', function () {
        $('.pop-up-change-meal').addClass('new-meal');
        $('.pop-up-change-meal h3').addClass('hide');
        $('.pop-up-change-meal-tabs span').removeClass('active');
        $('.pop-up-change-meal-tabs span:first-child').addClass('active');
        $('.collection-meals-block').empty();
        $('.meal').removeClass('product-to-change');
        $(this).parent().addClass('product-to-change');
        $('.pop-up-change-meal').removeClass('change-meal');
        $('body').addClass('active-pop-up');

        let meal_number = $(this).parent().find('.meal-number').text().replace('meal', ''),
            special_meal = $(this).parent().data('special'),
            first_price = 0;

        setProductsInPopUp(products, meal_number, special_meal, first_price);
      });
    }

    $('.pop-up-change-meal .close-pop-up-change-meal').click(function () {
      $('.pop-up-change-meal').addClass('hide').removeClass('change-meal new-meal special-meal').attr('data-change-price', '');
      $('body').removeClass('active-pop-up');
      $('.collection-meals-block').empty();
    });

  },

  addAllProducts: function(meal_packs_arr){
    $.ajax({
        method: "POST",
        url: "/cart/add.js",
        dataType: "json",
        data: {items: meal_packs_arr },
        success: function (xhr) {
          ajaxCart.load();
          slate.cart.openDrawer();
          $('.meal-pack-page').find('.custom-spinner').addClass('hide');
        },
        error: function (xhr){
          console.log(xhr.responseText);
        }
    })
  },

  createMealItems: function(discount, arr_meals, mealPackId, old_sum){
    let set_discount = 0;
    let meal_packs_arr = [];

    for(let j = 0; arr_meals.length> j; j++){
      let productData = {},
          full_meal = arr_meals[j],
          $mealPackSection = $(full_meal).closest('.daily-meal-plan'),
          last_meal = arr_meals.length*1 - 1,
          meal_discount_full_price = $(full_meal).attr('data-variant-price')*100,
          meal_discount_part;

      productData.id = $(full_meal).data('variant')*1;
      productData.quantity = 1;

      if(discount > 0 ){
        if( j < last_meal ){
          meal_discount_part = Math.round(meal_discount_full_price / old_sum * discount);
          set_discount += meal_discount_part;
        } else if( j == last_meal ){
          meal_discount_part = Math.round(discount - set_discount );
        }
      }

      productData.properties = {};
      productData.properties['_meal_pack_uniq_id'] = mealPackId;
      productData.properties['_meal_pack_prod_id'] = $mealPackSection.attr('data-id');
      productData.properties['Meal Pack'] = $mealPackSection.attr('data-title');
      productData.properties['Day'] = 'Day '+ $mealPackSection.attr('data-day');

      if (meal_discount_part > 0){
        productData.properties['_gwa_mp_discount_fixed'] = meal_discount_part;
      }

      meal_packs_arr.push(productData);
    }

    return meal_packs_arr
  },

  mealPackAddPlan: function (id_WM360){
    let _this = this;
    let mealPackId = +new Date();
    let add_pack_btn = $('[data-add-meal-pack-to-cart]');

    let old_sum = add_pack_btn.find('.old-pack-sum').text() * 100,
        new_sum = add_pack_btn.find('.new-pack-sum').text() * 100,
        discount;

    if (new_sum) {
      discount = Math.ceil(old_sum - new_sum);
    } else {
      discount = 0;
    }

    let arr_meals = $('.meal').filter(function( index, card ) {if(!$(card).hasClass('empty-meal')){ return card }});

    let meal_packs_arr = _this.createMealItems(discount, arr_meals, mealPackId, old_sum);

    if(id_WM360 && id_WM360 != undefined){
      let properties_block = $('.daily-meal-plan').first();
      let product_WM360 = {
        id : id_WM360,
        quantity: 1,
        properties : {
          _meal_pack_uniq_id: mealPackId,
          _meal_pack_prod_id: properties_block.attr('data-id'),
          'Meal Pack': properties_block.attr('data-title'),
          wm360: 'meal-pack'
        }
      };
      meal_packs_arr.push(product_WM360);
    }

    if (meal_packs_arr.length > 0) {
      _this.addAllProducts(meal_packs_arr);
    }
  },

  mealPackAddToCartProducts: function (){
    let _this = this;
    let id_WM360 = theme.productWM360Id * 1;

    $('.meal-pack-products').on('click', '[data-add-meal-pack-to-cart]', function (e) {
      e.preventDefault();
      if(id_WM360 > 0 && $('.mealPack-WM360__quiz').length > 0){
        _this.mealPackAddPlan(id_WM360);
      }else if (!$('.days-meal-plan').hasClass('meal-pack-fixed') && $('.meal-pack-offer').length > 0){
        $('body').addClass('active-pop-up');
        $('body').find('.meal-pack-offer').removeClass('hide');
      }else{
        $('body').addClass('active-pop-up');
        $('.meal-pack-page').find('.custom-spinner').removeClass('hide');
        _this.mealPackAddPlan();
      }
    });

    $('.meal-pack-products').on('click', '[data-meal-pack-offer__agree]', function (){
      _this.mealPackAddPlan(id_WM360);
      if ($('.meal-pack-offer').length > 0) {
        $('body').find('.meal-pack-offer').addClass('hide');
      }
      $('.meal-pack-page').find('.custom-spinner').removeClass('hide');
    });

    $('.meal-pack-products').on('click', '[data-meal-pack-offer__disagree]', function (){
      _this.mealPackAddPlan();
      if ($('.meal-pack-offer').length > 0) {
        $('body').find('.meal-pack-offer').addClass('hide');
      }
      $('.meal-pack-page').find('.custom-spinner').removeClass('hide');
    });
  }
};

theme.MealPackAjaxSection = (function() {
  function MealPackAjaxSection(container) {
    var el_container = (this.el_container = $(container));

    this.selectors = {
      mealPackMainSelector: '.meal-pack-page',
      mealPackPageSelector: '.days-meal-plan',
    };

    this.settings = {
      ajaxTemplateUrlParam: 'view=' + el_container.attr('data-ajax-template'),
      namespace: '.mealPackAjaxSection'
    };

    var el_initialPage = $(this.selectors.mealPackPageSelector);
    this.startChangeMealPackListener(el_initialPage);
  }

  MealPackAjaxSection.prototype = Object.assign({}, MealPackAjaxSection.prototype, {
    startChangeMealPackListener: function(el_page) {
      var _this = this;

      $('.test-meal-pack .btn-days').click(function () {
        var gender = $('.question-content').data('gender'),
            activity = $('.question-content').data('activity'),
            content = $(this).data('days'),
            days = content*1 - 5,
            meal_pack_obj = meal_packs_test_answers[gender][activity][days],
            meal_pack_key = Object.keys(meal_pack_obj)[0],
            meal_pack_price = meal_pack_obj[meal_pack_key],
            meal_pack_discount = meal_pack_price / 10,
            meal_pack_new_price = meal_pack_price - meal_pack_discount,
            mealPackUrl = '/products/' + meal_pack_key;

        $('#shopify-section-you-may-also-like').addClass('slow');
        $('#shopify-section-rich-text-with-image-copy').fadeOut('slow');

        window.history.pushState("/collections/", "Full Meals Pack", mealPackUrl);

        $.ajax({
          type: 'GET',
          url: mealPackUrl + '?' + _this.settings.ajaxTemplateUrlParam,
          cache: false,
          dataType: 'html',
          success: function (data) {
            $('.meal-pack-page').empty().append(data);
            $('.meal-pack-products').fadeIn("slow");

            if($('body').data('customer') != ""){
              var userGA_obj = meal_pack_key+', Logged In, '+$('body').data('customer');
            }else{
              var userGA_obj = meal_pack_key;
            }

            if(window.ga){
              ga('create', 'UA-34707600-1', 'auto');
              ga('set', 'dimension1', userGA_obj );
              // Send the custom dimension value with a pageview hit.
              ga('send', 'pageview', userGA_obj);
            }
          }
        })
      });

      $('.question-meal-pack .btn-days').click(function () {
        var content = $(this).data('days'),
            days = content*1 - 5,
            meal_pack = meal_packs_days_answer[days],
            mealPackUrl = '/products/' + meal_pack;

        $('#shopify-section-you-may-also-like').addClass('slow');
        $('#shopify-section-rich-text-with-image-copy').fadeOut('slow');

        window.history.pushState("/collections/", "Full Meals Pack", mealPackUrl);

        $.ajax({
          type: 'GET',
          url: mealPackUrl + '?' + _this.settings.ajaxTemplateUrlParam,
          cache: false,
          dataType: 'html',
          success: function (data) {
            $('.meal-pack-page').empty().append(data);
            $('.meal-pack-products').fadeIn("slow");
          }
        })
      });
    }
  });
  return MealPackAjaxSection;
})();

theme.MealPackWM360 = {
  meal_packs_arr: theme.meal_packs_WM360,
  meal_packs_template: [],
  meal_packs_days_count: [],
  meal_packs_meals_count: [],
  container_info: $('[data-section-mealPack-WM360]'),
  container: $('[data-section-mealPack-WM360-products]'),
  meal_pack_days: 0,
  meal_pack_collection_url: '',

  initQuiz: function (){
    let _this = this;
    let pack_goal = $(_this.container_info).data("pack-goal");
    let pack_gender = $(_this.container_info).data("pack-gender");

    _this.meal_pack_collection_url = window.location.href;
    _this.meal_packs_template = _this.meal_packs_arr.filter(function(meal_pack){
      return meal_pack.gender === pack_gender && meal_pack.goal === pack_goal;
    });

    _this.quizActions();
  },

  quizActions: function (){
    let _this = this;
    $('.btn-answer-wm360 [name="wm360-days"]').on('change click',function(){
      let btn = $(this);
      _this.meal_pack_days = btn.val();
      _this.filteringMealPacks('days', btn.val());
      _this.quizChangeBlocks('WM360-quiz__block-days', 'WM360-quiz__block-meals');
    });

    $('.btn-answer-wm360 [name="wm360-meals"]').on('change click',function(){
      let btn = $(this);
      let meals_quantity = _this.meal_pack_days * btn.val();
      _this.filteringMealPacks('quantity', meals_quantity);
      _this.quizChangeBlocks('WM360-quiz__block-meals', 'WM360-quiz__block-allergens');
    });

    $('[data-WM360-quiz-back]').click(function () {
      let block_close = $(this).data('close');
      let block_open = $(this).data('prev');
      _this.quizChangeBlocks(block_close, block_open);
      if (block_close == 'WM360-quiz__block-success'){
        window.history.pushState("/products/", "Collection Meals Pack WM360", _this.meal_pack_collection_url);
        $('.meal-pack-products').fadeOut("slow", function() {
          $(_this.container).find('.meal-pack-page').empty();
        });
      }
    });

    $('[data-WM360-quiz-confirm]').click(function () {
      let allergens_arr = [];
      $('input[name="wm360-allergen"]:checked').each(function(){
        allergens_arr.push($(this).val());
      });
      if(allergens_arr.length > 0){
        _this.filteringAllergensMealPacks(allergens_arr);
      }else{
        if(_this.meal_packs_meals_count.length > 0){
          _this.showMealPack(_this.meal_packs_meals_count[0].product_handle);
          _this.quizChangeBlocks('WM360-quiz__block-allergens', 'WM360-quiz__block-success');
        }else{
          _this.quizChangeBlocks('WM360-quiz__block-allergens', 'WM360-quiz__block-error');
        }
      }
    });
  },

  quizChangeBlocks: function (close_block, open_block){
    let _this = this;
    let index;

    $('.WM360-quiz__navigation span').removeClass('WM360-quiz__navigation-active');
    $('.'+close_block).fadeOut("slow", function() {
      $('.'+open_block).fadeIn("slow");
    });

    if(open_block == "WM360-quiz__block-days"){
      index = 1
    }else  if(open_block == "WM360-quiz__block-meals"){
      index = 2
      _this.setMealsQTY();
    }else  if(open_block == "WM360-quiz__block-allergens"){
      index = 3
    }else{
      index = 4
    }
    $('.WM360-quiz__navigation span:nth-child('+index+')').addClass('WM360-quiz__navigation-active');
  },

  setMealsQTY: function (){
    let _this = this;
    $('.WM360-quiz__block-meals .btn-answer-wm360').each(function (i, answer_block) {
      $(answer_block).find('.WM360-quiz__block-meals-days').text(_this.meal_pack_days);
      let meals_per_day = $(answer_block).find('input[name="wm360-meals"]').val();
      $(answer_block).find('.WM360-quiz__block-meals-days').text(_this.meal_pack_days);
      $(answer_block).find('.WM360-quiz__block-meals-qty').text(_this.meal_pack_days * meals_per_day);
    });
  },

  filteringMealPacks: function(question, answer){
    let _this = this;
    if(question == 'days'){
      _this.meal_packs_days_count = _this.meal_packs_template.filter(function(meal_pack){
        if(meal_pack[question] == answer){
          return meal_pack
        }
      });
    }else{
      _this.meal_packs_meals_count = _this.meal_packs_days_count.filter(function(meal_pack){
        return meal_pack[question] == answer;
      });
    }
  },

  filteringAllergensMealPacks: function(allergens_arr){
    let _this = this;
    let answer_packs = _this.meal_packs_meals_count.filter(function(meal_pack) {
      let count_a = 0;
      $.each(meal_pack.allergens, function (key, value) {
        let index = $.inArray(value, allergens_arr);
        if (index > -1) {
          count_a += 1;
        }

      });
      if (count_a < 1) {
        return meal_pack
      }
    });
    if(answer_packs.length>0){
      _this.showMealPack(answer_packs[0].product_handle);
      _this.quizChangeBlocks('WM360-quiz__block-allergens', 'WM360-quiz__block-success');
    }else{
      _this.quizChangeBlocks('WM360-quiz__block-allergens', 'WM360-quiz__block-error');
    }
  },

  showMealPack: function(meal_pack_key){
    let _this = this;
    let mealPackUrl = '/products/' + meal_pack_key;
    let ajaxTemplateUrlParam = 'view=' + $(_this.container).data('ajax-template');

    window.history.pushState("/collections/", "Full Meals Pack", mealPackUrl);

    $.ajax({
      type: 'GET',
      url: mealPackUrl + '?' + ajaxTemplateUrlParam,
      cache: false,
      dataType: 'html',
      success: function (data) {
        $(_this.container).find('.meal-pack-page').empty().append(data);
        $('.meal-pack-products').fadeIn("slow");
      },
      error: function (ex) {
        console.log(ex.responseText);
      }
    })
  }
};

/*console.log(theme.meal_packs_WM360);*/
/*===============================================
* delivery-map.js
* ================================================*/
/* DELIVERY FAQS */
$('.delivery-faqs-block button').click(function () {
  let faq_block = $(this).parent();
  if(faq_block.hasClass('active')){
    faq_block.find('.delivery-faqs-block__answer').fadeOut(400);
    faq_block.removeClass('active');
  }else{
    faq_block.find('.delivery-faqs-block__answer').fadeIn(400);
    faq_block.addClass('active');
  }
});


/*===============================================
* slider.js
* ================================================*/
// Slideshow section
$(document).on('shopify:section:select', Slideshow);
$(document).on('shopify:section:load', Slideshow);

$(document).on('shopify:section:select', SlideshowChannels);
$(document).on('shopify:section:load', SlideshowChannels);

$(document).on('shopify:section:select', SimpleSlider);
$(document).on('shopify:section:load', SimpleSlider);

$(document).on('shopify:section:select', BlogSlider);
$(document).on('shopify:section:load', BlogSlider);

$(document).on('shopify:section:select', AboutUsSlider);
$(document).on('shopify:section:load', AboutUsSlider);

$(document).on('shopify:section:select', ReviewsSlider);
$(document).on('shopify:section:load', ReviewsSlider);

function Slideshow() {
  let time = $('.template-index .slideshow-section').attr("data-slide-speed") * 1000;

  $('.template-index .slideshow-section').slick({
    dots: true,
    infinite: true,
    speed: 1000,
    autoplay: true,
    autoplaySpeed: time,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    pauseOnFocus: true,
    pauseOnHover: true
  });

}

function SlideshowChannels() {
  let slide_time = $('.section-channels section').attr("data-slide-speed") * 1000;

  $('.channels-slider').slick({
    autoplay: true,
    autoplaySpeed: slide_time,
    dots: false,
    infinite: true,
    speed: 1000,
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 800,
        settings: {
          slidesToShow: 3
        }
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 2
        }
      },
      {
        breakpoint: 450,
        settings: {
          slidesToShow: 1
        }
      }
    ]
  });
}

function SimpleSlider() {
  let time = $('.simple-slider-section').attr("data-slide-speed") * 1000;

  $('.simple-slider-section').slick({
    dots: true,
    infinite: true,
    speed: 1000,
    autoplay: true,
    autoplaySpeed: time,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false
  });
}

function BlogSlider() {
  let time = $('.blog-banner-slider .simple-slider-section').attr("data-slide-speed") * 1000;

  $('.blog-banner-slider .simple-slider-section').slick({
    dots: true,
    infinite: true,
    speed: 1000,
    autoplay: true,
    autoplaySpeed: time,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false
  });
}

function AboutUsSlider() {
  let time = $('#slick-about-us--slider').attr("data-slide-speed") * 1000;

  $('#slick-about-us--slider').slick({
    dots: true,
    infinite: true,
    speed: 1000,
    autoplay: true,
    autoplaySpeed: time,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    pauseOnFocus: true,
    pauseOnHover: true
  });

}

function ReviewsSlider() {
  let time = $('.about-us-featured-reviews').attr("data-slide-speed") * 1000;

  $('.featured-reviews-content').slick({
    dots: true,
    infinite: true,
    speed: 500,
    autoplay: true,
    autoplaySpeed: time,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: true,
    cssEase: 'linear',
    centerMode: true,
    centerPadding: '0px',
    customPaging: function(slider, i) {
      let thumb = $(slider.$slides[i]).data('thumb');
      return '<img src="'+thumb+'">';
    }
  });

}

//Slide video for mobile
$(window).on('resize', function () {
  if ($('.homepage-video-with-mobile').length > 0 && ($('.homepage-video-with-mobile').attr('src-webm-mob') != ''
      || $('.homepage-video-with-mobile').attr('src-mp4-mob') != ''
      || $('.homepage-video-with-mobile').attr('src-ogg-mob') != '')){
    videoConteinerSource($(window).width());
  }
});

function videoConteinerSource (windowWidth) {
  let videoConteiner = $('.homepage-video-with-mobile');

  videoConteiner.each(function(){
    let videoTag = $(this),
        videoWidth = '',
        videoW = videoTag.attr("src-webm"),
        videoM = videoTag.attr("src-mp4"),
        videoO = videoTag.attr("src-ogg");

    if(windowWidth < 768) {
      videoWidth = windowWidth - 24;
      videoW = videoTag.attr("src-webm-mob");
      videoM = videoTag.attr("src-mp4-mob");
      videoO = videoTag.attr("src-ogg-mob");
    }

    if (videoTag.attr("width") != videoWidth) {
      videoTag.empty();
      videoTag.attr("width", videoWidth).append('<source src="' + videoW + '" type="video/webm"><source src="' + videoM + '" type="video/mp4"><source src="' + videoO + '" type="video/ogg">Your browser does not support the video tag.');
      videoTag[0].load();
    }
  });
}

// =require sections/steps-with-image.js
/*===============================================
* product-card-grid.js
* ================================================*/
//Product card grid
//Display variant product

function openProdDesc(evt, desc, dataProdId) {
  let i, tabcontent, tablinks;

  tablinks = document.getElementsByClassName("tablinks-" + dataProdId);
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  tabcontent = document.getElementsByClassName("tabcontent-" + dataProdId);
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  document.getElementById(desc).style.display = "block";
  evt.currentTarget.className += " active";
}

$('.tablinks').on('mouseover', function(){
  let dataProdId = $(this).attr("data-product-id");

  if( dataProdId == $(this).parent().attr("data-product-id") ){
    let tab = "tabcontent-"+ $(this).attr("data-variant")+"-"+$(this).html();
    openProdDesc(event, tab, dataProdId);
  }
});

$('.tablinks').on('click', function(e){
  e.preventDefault();
});
/*===============================================
* collections.js
* ================================================*/
//Section collections tab

function openCollectionProduct(evt, desc) {
  let i, tabcontent, tablinks;
  //tabcontent = document.getElementsByClassName("tabcontent-collection");
  tabcontent = evt.currentTarget.parentElement.parentElement.getElementsByClassName("tabcontent-collection");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
    tabcontent[i].className = tabcontent[i].className.replace("show", "");
  }
  //tablinks = document.getElementsByClassName("tablinks-collection");
  tablinks = evt.currentTarget.parentElement.parentElement.getElementsByClassName("tablinks-collection");
  console.log(tablinks);
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(desc).style.display = "block";
  document.getElementById(desc).className += " show";
  evt.currentTarget.className += " active";
}

$('.tablinks-collection').on('mouseover', function(){
  let tab = "tabcontent-"+ $(this).attr("data-collection-handle");
  openCollectionProduct(event, tab);
});

$(".tabcontent-collection").css("display","none");

//Tab with collection
$(".popular-menu .tablinks-collection:eq(0)").addClass("active");
$(".popular-menu .tabcontent-collection:eq(0)").css("display","block");

//Tab with collection
$(".main-information .tablinks-collection:eq(0)").addClass("active");
$(".main-information .tabcontent-collection:eq(0)").css("display","block");



/*===============================================
* the-goal.js
* ================================================*/
//Script for section the goal

function openTabcontent(evt, desc) {
  let i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent-goal");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
    tabcontent[i].style.opacity = 0;
  }
  tablinks = document.getElementsByClassName("tablinks-gender");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(desc).style.display = "block";
  evt.currentTarget.className += " active";
}
$('.tablinks-gender').on('click', function(){
  $("#tabcontent-"+ $(this).attr("data-gender")).css("height", "max-content");
  openTabcontent(event, "tabcontent-"+ $(this).attr("data-gender"));
  $("#tabcontent-" + $(this).attr("data-gender")).animate({
    opacity: 1
  }, 900 );
});

// Tabs height alignment
function equalHeight(group) {
  let tallest = 0;
  group.each(function() {
    let thisHeight = $(this).height();
    if(thisHeight > tallest) {
      tallest = thisHeight;
    }
  });
  group.height(tallest);
}

$(document).on('shopify:section:select', goalSlideMale);
$(document).on('shopify:section:load', goalSlideMale);
$(document).on('shopify:section:select', goalSlideFemale);
$(document).on('shopify:section:load', goalSlideFemale);

// Slider for goal section
function goalSlideMale() {
  $('.goal-info-male').slick({
    dots: true,
    autoplay: false,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    arrows: false,
    fade: true,
    swipe: false,
    cssEase: 'ease',
    customPaging: function (slider, i) {
      let thumb = $(slider.$slides[i]).data("title");
      return '<a>'+thumb+'</a>';
    }
  });

}

function goalSlideFemale() {
  $('.goal-info-female').slick({
    dots: true,
    autoplay: false,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    arrows: false,
    fade: true,
    swipe: false,
    cssEase: 'ease',
    customPaging: function (slider, i) {
      let thumb = $(slider.$slides[i]).data("title");
      return '<a>'+thumb+'</a>';
    }
  });
}
/*===============================================
* meal-packs.js
* ================================================*/
$(document).on('shopify:section:select', SlideshowMealpacks);
$(document).on('shopify:section:load', SlideshowMealpacks);

function SlideshowMealpacks() {
  $('.meal-packs-section').slick({
    dots: true,
    infinite: true,
    speed: 1000,
   // centerMode: false,
   // centerPadding: '0px',
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: true,
    // customPaging : function(slider, i) {
    //     let thumb = $(".meal-pack:eq("+i+")").attr("data-title");
    //     return '<a>'+thumb+'</a>';
    // },
   customPaging : function(slider, i) {
      let thumb = $(slider.$slides[i]).data("title");
      return '<a>'+thumb+'</a>';
    },

    responsive: [
      {
        breakpoint:950,
        settings: {
          slidesToShow: 3
        }
      },
      {
        breakpoint: 750,
        settings: {
          slidesToShow: 2
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1
        }
      }
    ]
  })
}

// =require sections/meal-packs-without-center.js
/*===============================================
* why-workout-meals.js
* ================================================*/
//Slider with points
$(".points-slider").slick({
  dots: true,
  infinite: true,
  autoplay: true,
  speed: 2000,
  autoplaySpeed: 3000,
  slidesToShow: 1,
  slidesToScroll: 1,
  arrows: false,
  fade: true,
  cssEase: 'ease',
  pauseOnHover: true,
  customPaging: function(slider, i) {
    let img = $(slider.$slides[i]).data("point");
    return '<a>'+img+'</a>';
  }
});

/*===============================================
* header-footer.js
* ================================================*/
//Script for header

//Desktop dropdown menu
$(".dropdown-item a").click(function() {
  if($(this).hasClass("open")){
    $(this).removeClass("open");
    $(".dropdown-item a").removeClass("open");
  }else{
    $(".dropdown-item a").removeClass("open");
    $(this).addClass("open");
  }

  $(".dropdown-menu-overlay").removeClass("active-dropdown-menu");
  $(".dropdown-item a svg").removeClass("rotate");

  if($(this).hasClass("open")){
    $(this).parent().find(".dropdown-menu-overlay").addClass("active-dropdown-menu");
    $(this).find("svg").addClass("rotate");
  }
});

//Mobile hamburger
$(".menu-toggle-btn, .menu-close").on("click", function(e){
  e.preventDefault();
  $(".menu-drawer").toggleClass("active");
  $(".menu-toggle-btn").toggleClass("menu-toggle-btn-active");

  // $(window).resize(function () {
  //     $('.menu-drawer').removeClass("active");
  //     $(".menu-toggle-btn").removeClass("menu-toggle-btn-active");
  // });
});

//Mobile dropdown menu
$(".link-dropdown > a").on("click", function (e) {
  e.preventDefault();
  $(this).parent().find(".gw-submenu").slideToggle();
  $(this).find('svg').toggleClass('rotate');
});

//Search dropdown
$(".search-icon__icon").on("click", function (e) {
  $(this).toggleClass("search-icon__icon-active");
  $(".search-overlay").toggleClass("search-overlay--active");
});

$(".menu-drawer .search-title").on("click", function (e) {
  $(".search-icon__icon-mob").toggleClass("search-icon__icon-active");
  $(".search-overlay-mob").fadeToggle();
});

$(document).mouseup(function(e) {
  let $target = $(e.target);
  if ($target.closest(".dropdown-menu-overlay").length == 0 && $target.closest(".dropdown-item").length == 0) {
    $(".dropdown-menu-overlay").removeClass("active-dropdown-menu");
    $(".dropdown-item a svg").removeClass("rotate");
  }
  if ($target.closest(".menu-toggle-btn").length == 0 && $target.closest(".menu-drawer").length == 0) {
    $(".menu-drawer").removeClass("active");
    $(".menu-toggle-btn").removeClass("menu-toggle-btn-active");
  }
  if ($target.closest(".search-icon__icon").length == 0 && $target.closest(".search-overlay").length == 0) {
    $(".search-overlay").removeClass("search-overlay--active");
    $(".search-icon__icon").removeClass("search-icon__icon-active");
  }
});
/*===============================================
* contact-faq.js
* ================================================*/
/* Contact FAQS */
$('.faq-question').click(function () {
  $(this).parent().siblings().find('.faq-answer').fadeOut(0);

  $(this).next('.faq-answer').fadeIn(400);
});

$('.faq-answer p:first-child').click(function () {
  $(this).parent('div').fadeOut(200);
});
/*===============================================
* customer.js
* ================================================*/
//Display customer's password
$('.showpass').on("click", function(){
  let type = $('.inputPassword').attr('type') == "text" ? "password" : 'text';
  $('.inputPassword').prop('type', type);

  if($('.inputPassword').attr('type') == "text"){
    $(".showpass").addClass("showpass-active");
  } else{
    $(".showpass").removeClass("showpass-active");
  }
});
/*===============================================
* blog-and-articles.js
* ================================================*/
//Slider for related articles

$(document).on('shopify:section:select', SlideArticles);
$(document).on('shopify:section:load', SlideArticles);

function SlideArticles() {

  $('.blogs-slider').slick({
    dots: true,
    infinite: true,
    speed: 1000,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    responsive: [
      {
        breakpoint: 1174,
        settings: {
          slidesToShow: 2
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          arrows: false
        }
      }
    ]
  });
}

/*===============================================
* steps-slider.js
* ================================================*/
//Slider with steps
$(document).on('shopify:section:select', StepsSliderHomepage);
$(document).on('shopify:section:load', StepsSliderHomepage);

$(document).on('shopify:section:select', StepsSliderCopy);
$(document).on('shopify:section:load', StepsSliderCopy);

$(document).on('shopify:section:select', StepsSliderCopy2);
$(document).on('shopify:section:load', StepsSliderCopy2);

function StepsSliderHomepage() {
  let time = $('.steps-slider-main-section .steps-slider').attr("data-speed-slide") * 1000,
      pointsStyle = $('.steps-slider-main-section .steps-slider').attr("data-points-style");

  if( pointsStyle == 'figure' ){
    $(".steps-slider-main-section .steps-slider").slick({
      dots: true,
      infinite: true,
      autoplay: true,
      speed: 1000,
      autoplaySpeed: time,
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      fade: true,
      pauseOnHover: true,
      cssEase: 'ease',
      customPaging: function (slider, i) {
        return '<a class="icon-figure icon-'+(i+1)+'"></a>';
      }
    });
  } else {
    $(".steps-slider-main-section .steps-slider").slick({
      dots: true,
      infinite: true,
      autoplay: true,
      speed: 1000,
      autoplaySpeed: time,
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      fade: true,
      pauseOnHover: true,
      cssEase: 'ease',
      customPaging: function (slider, i) {
        let thumb = $(slider.$slides[i]).data();
        return '<a>' + (i + 1) + '</a>';
      }
    });
  }
}

function StepsSliderCopy() {
  let time = $('.steps-slider-section-copy .steps-slider').attr("data-speed-slide") * 1000,
      pointsStyle = $('.steps-slider-section-copy .steps-slider').attr("data-points-style");

  if( pointsStyle == 'figure' ){
    $(".steps-slider-section-copy .steps-slider").slick({
      dots: true,
      infinite: true,
      autoplay: true,
      speed: 1000,
      autoplaySpeed: time,
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      fade: true,
      pauseOnHover: true,
      cssEase: 'ease',
      customPaging: function (slider, i) {
        return '<a class="icon-figure icon-'+(i+1)+'"></a>';
      }
    });
  } else {
    $(".steps-slider-section-copy .steps-slider").slick({
      dots: true,
      infinite: true,
      autoplay: true,
      speed: 1000,
      autoplaySpeed: time,
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      fade: true,
      pauseOnHover: true,
      cssEase: 'ease',
      customPaging: function (slider, i) {
        let thumb = $(slider.$slides[i]).data();
        return '<a>' + (i + 1) + '</a>';
      }
    });
  }
}

function StepsSliderCopy2() {
  let time = $('.steps-slider-section-copy-second .steps-slider').attr("data-speed-slide") * 1000,
      pointsStyle = $('.steps-slider-section-copy-second .steps-slider').attr("data-points-style");

  if( pointsStyle == 'figure' ){
    $(".steps-slider-section-copy-second .steps-slider").slick({
      dots: true,
      infinite: true,
      autoplay: true,
      speed: 1000,
      autoplaySpeed: time,
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      fade: true,
      pauseOnHover: true,
      cssEase: 'ease',
      customPaging: function (slider, i) {
        return '<a class="icon-figure icon-'+(i+1)+'"></a>';
      }
    });
  } else {
    $(".steps-slider-section-copy-second .steps-slider").slick({
      dots: true,
      infinite: true,
      autoplay: true,
      speed: 1000,
      autoplaySpeed: time,
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      fade: true,
      pauseOnHover: true,
      cssEase: 'ease',
      customPaging: function (slider, i) {
        let thumb = $(slider.$slides[i]).data();
        return '<a>' + (i + 1) + '</a>';
      }
    });
  }
}

/*===============================================
* product-recommendations.js
* ================================================*/
//Slider for related products

$(document).on('shopify:section:select', SliderRelatedProducts);
$(document).on('shopify:section:load', SliderRelatedProducts);

function SliderRelatedProducts() {
  $('.product-recommendations_slider').slick({
    dots: false,
    infinite: true,
    speed: 1000,
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: true,
    responsive: [
      {
        breakpoint: 1174,
        settings: {
          slidesToShow: 3,
          slidesToScroll:1
        }
      },
      {
        breakpoint: 966,
        settings: {
          slidesToShow: 2
        }
      },
      {
        breakpoint: 550,
        settings: {
          slidesToShow: 1
        }
      }
    ]
  });
}

/*===============================================
* cart-drawer.js
* ================================================*/
if (window.theme.cartType == 'drawer') {
  /*============================================================================
      Ajax Shopify Add To Cart
    ==============================================================================*/
  var ajaxCart = (function (module, $) {
    // 'use strict';
    // Public functions
    var init, loadCart;

    // Private general variables
    var settings, isUpdating, $body/*, cartStatic*/;

    // Private plugin variables
    var $formContainer,
        $addToCart,
        $addToCartHome,
        $cartCountSelector,
        $cartCostSelector,
        $cartContainer,
        $cartRecommendsContainer;

    // Private functions
    var updateCountPrice,
        formOverride,
        itemAddedCallback,
        itemErrorCallback,
        cartUpdateCallback,
        buildCart,
        cartCallback,
        adjustCart,
        adjustCartCallback,
        qtySelectors,
        validateQty,
        createProgressDot,
        cartDrawerProgressBar,
        progressBarAddGift,
        progressBarCheckGift,
        cartProgressBar,
        drawerOpen,
        formOverrideSubmit,
        removeMealPack,
        checkDrawerGifts,
        giftsProgressBarAdd,
        giftsProgressBarRemove,
        giftsProgressBarCount,
        cartGiftsUpdate;

    /*============================================================================
          Initialise the plugin and define global options
        ==============================================================================*/
    init = function (options) {
      // Default settings
      settings = {
        formSelector:             'form[action^="/cart/add"]',
        cartContainer:            '#CartContainer',
        //  cartRecommendsContainer:  '#CartRecommends',
        addToCartSelector:        '.add-to-cart-plan',
        cartCountSelector:        'span.header-cart-item-count',
        //cartCostSelector:         null,
        moneyFormat:              window.theme.moneyFormat,
        disableAjaxCart:          false,
        //cartStaticSelector:       '#CartStatic',
        enableQtySelectors:       true
      };

      // Override defaults with arguments
      $.extend(settings, options);

      // Select DOM elements
      $formContainer = $(settings.formSelector);
      $cartContainer = $(settings.cartContainer);
      $addToCart = $(settings.addToCartSelector);
      $cartCountSelector = $(settings.cartCountSelector);

      // General Selectors
      $body = $('body');

      // Track cart activity status
      isUpdating = false;

      // Take over the add to cart form submit action if ajax enabled
      if (!settings.disableAjaxCart && $addToCart.length) {
        formOverride();
      }

      // Run this function in case we're using the quantity selector outside of the cart
      adjustCart();
    };

    loadCart = function () {
      $body.addClass('drawer--is-loading');
      ShopifyAPI.getCart(cartUpdateCallback);
    };

    updateCountPrice = function (cart) {
      if ($cartCountSelector) {
        $cartCountSelector.html(cart.item_count).removeClass('hide');

        if (cart.item_count === 0) {
          $cartCountSelector.addClass('hide');
        }
      }
    };

    formOverride = function () {
      $formContainer.on('submit', function (evt) {
        evt.preventDefault();

        let $addToCartForm = $(this),
            inventoryMaxInput = $addToCartForm.find('input[name="properties[_inventory_max]"]'),
            inventoryMax, id, newQty;
        if (inventoryMaxInput.length > 0) {
          $formContainer.next('.qty-error').remove();
          inventoryMax = parseInt(inventoryMaxInput.val());
          id = $addToCartForm.find('#ProductSelect').val();
          newQty = $addToCartForm.find('input[name="quantity"]').length > 0 ? parseInt($addToCartForm.find('input[name="quantity"]').val()) : 1;

          $.getJSON('/cart.js', function (cart) {
            let existQty = 0,
                resultQty = newQty,
                result = $.grep(cart.items, function (e) {
                  if (e.id == id) {
                    existQty += e.quantity;
                    resultQty += e.quantity;
                    return (resultQty > inventoryMax) ? e : null;
                  }
                });

            if (result.length == 0) {
              formOverrideSubmit(evt);
            } else {
              var responseText = "All " + inventoryMax + " " + result[0].title + " are in your cart.";
              var responseText2 = "You can only add " + (inventoryMax - existQty) + " " + result[0].title + " to the cart.";
              $formContainer.after('<div class="errors qty-error">' + (inventoryMax - existQty != 0 && newQty > inventoryMax - existQty ? responseText2 : responseText) + '</div>');
            }
          });

        } else {
          formOverrideSubmit(evt);
        }
      });
    };

    formOverrideSubmit = function (evt) {
      // Add class to be styled if desired
      $addToCart.removeClass('is-added').addClass('is-adding');

      // Remove any previous quantity errors
      $('.qty-error').remove();

      ShopifyAPI.addItemFromForm(
          evt.target,
          itemAddedCallback,
          itemErrorCallback
      );
    };

    itemAddedCallback = function () {
      setTimeout(function(){
        $addToCart.removeClass('is-adding').addClass('is-added');
        ShopifyAPI.getCart(cartUpdateCallback);
      }, 600);

    };

    itemErrorCallback = function (XMLHttpRequest) {
      var data = eval('(' + XMLHttpRequest.responseText + ')');
      $addToCart.removeClass('is-adding is-added');

      if (data.message) {
        if (data.status === 422) {
          $formContainer.after(
              '<div class="errors qty-error">' + data.description + '</div>'
          );
        }
      }
    };

    cartUpdateCallback = function (cart) {
      // Update quantity and price
      updateCountPrice(cart);
      // cartProgressBar(cart);
      buildCart(cart);
    };

    buildCart = function (cart) {
      // Start with a fresh cart div
      $('.drawer__count span').text(cart.item_count);
      $cartContainer.empty();

      if ($('.progress-bar_container').length > 0 && $('body').hasClass('template-collection') && $('body').attr('id') == 'menu') {
        slate.cart.collectionProgressBar(cart);
      }

      $('.drawer__cart-empty').addClass('hide');

      // Show empty cart
      if (cart.item_count === 0) {
        $('.drawer__cart-empty').removeClass('hide');
        cartCallback(cart);
        return;
      } else {
        $('.drawer__cart-empty').addClass('hide');
        $('.drawer__cart').removeClass('hide');
        $('.drawer__count').removeClass('hide');
      }

      // Handlebars.js cart layout
      var items = [],
          item = {},
          data = {},
          mealPacksInCart = false,
          mealPacks = [],
          mealPacksIds = [], //;
          source = $('#CartTemplate').html(),
          template = Handlebars.compile(source);

      var general_subscribeProp = false,
          cart_handle_array = [];

      // Add each item to our handlebars.js data
      $.each(cart.items, function (index, cartItem) {

        var img_small = cartItem.image.replace(/(\.[^.]*)$/,'_100x100$1').replace('https:', ''),
            img_medium = cartItem.image.replace(/(\.[^.]*)$/,'_150x150$1'),
            img_large = cartItem.image.replace(/(\.[^.]*)$/,'_200x200$1'),
            img_huge = cartItem.image.replace(/(\.[^.]*)$/,'_300x300$1'),
            srcImg = 'srcset='+ img_small +', '+ img_medium +' 1.5x, '+ img_large +' 2x, '+ img_huge +' 3x" src='+ img_small,
            mealPackItem = false,
            mealPackId,
            mealPackProdId,
            mealPackDay;

        if (cartItem.properties !== null) {
          if (cartItem.properties['subscription_id']) {
            subscribeProp = true;
            general_subscribeProp = true;
            var subscribeFrequency = cartItem.properties['shipping_interval_frequency'];
            var subscribeType = cartItem.properties['shipping_interval_unit_type'];
          }
          if (cartItem.properties['volume']){
            var item_volume = cartItem.properties['volume'];
          }

          $.each(cartItem.properties, function (key, value) {
            if (key === '_meal_pack_uniq_id') {
              mealPackItem = true;
              mealPacksInCart = true;
              mealPackId = value;
            }
            if (key === '_meal_pack_prod_id') {
              mealPackProdId = value;
            }
            if (key === 'Day') {
              mealPackDay = value;
            }
            if (key.charAt(0) === '_' || !value) {
              delete cartItem.properties[key];
            }
          });

          if (mealPackItem) {
            var mealPackItemData = {
              itemQty: cartItem.quantity,
              name:                cartItem.product_title,
              variationName:       cartItem.options_with_values[0].name,
              variation:           cartItem.variant_title,
              price:               slate.Currency.formatMoney(cartItem.line_price, theme.moneyFormat),
              fullImg:             srcImg,
              day:                 mealPackDay
            };
            if (mealPacksIds.indexOf(mealPackId) < 0) {
              mealPacksIds.push(mealPackId);
              var mealPackData = window.mealPacksDetails[mealPackProdId];
              mealPacks.push({
                id:         mealPackId,
                title:      mealPackData.title,
                url:        mealPackData.url,
                thumb:      mealPackData.thumb,
                price:      cartItem.line_price,
                count:      cartItem.quantity,
                items:      [mealPackItemData]
              });
            }
            else {
              $.each(mealPacks, function(ind, mealPack){
                if (mealPack.id == mealPackId){
                  mealPack.price += cartItem.line_price;
                  mealPack.count += cartItem.quantity;
                  mealPack.items.push(mealPackItemData);
                }
              });
            }
          }
        }

        // Create item's data object and add to 'items' array
        item = {
          key:                 cartItem.key,
          line:                index + 1, // Shopify uses a 1+ index in the API
          url:                 (cartItem.properties['wm360']) ? '#' : cartItem.url,
          itemId:              cartItem.id,
          itemPrice:           cartItem.price > 1 ? false : true,
          fullImg:             srcImg,
          name:                cartItem.product_title,
          variationName:       cartItem.options_with_values[0].name,
          variation:           cartItem.variant_title,
          properties:          cartItem.properties,
          itemVolume:          item_volume,
          itemAdd:             cartItem.quantity + 1,
          itemMinus:           cartItem.quantity - 1,
          itemQty:             cartItem.quantity,
          price:               cartItem.properties && cartItem.properties.configuredPrice ? cartItem.properties.configuredPrice : slate.Currency.formatMoney(cartItem.price, theme.moneyFormat),
          discountedPrice:     slate.Currency.formatMoney(
              cartItem.price - cartItem.total_discount / cartItem.quantity,
              theme.moneyFormat
          ),
          discounts:           cartItem.discounts,
          discountsApplied:
              cartItem.price === cartItem.price - cartItem.total_discount
                  ? false
                  : true,
          vendor:              cartItem.vendor,
          mealPack: mealPackItem
        };

        if (mealPackItem) {
          item.mealPackId = mealPackId;
        }

        cart_handle_array.push(cartItem.handle);
        items.push(item);
      });

      var totalPrice = cart.total_price /*+ shipping*/;

      // Gather all cart data and add to DOM
      data = {
        items:              items,
        mealPacksInCart:    mealPacksInCart,
        note:               cart.note,
        subtotalPrice:      slate.Currency.formatMoney(cart.total_price, theme.moneyFormat),
        totalPrice:         slate.Currency.formatMoney(totalPrice, theme.moneyFormat),
        generalSubscribeProp: general_subscribeProp,
        totalCartDiscount:  cart.total_discount === 0 || theme.strings.cartSavings == undefined ? 0 : theme.strings.cartSavings.replace('[savings]', slate.Currency.formatMoney(cart.total_discount, theme.moneyFormat))
      };

      if (mealPacksInCart) {
        data.mealPacks = $.each(mealPacks, function(ind, mealPack){
          mealPack.price = slate.Currency.formatMoney(mealPack.price, theme.moneyFormat);
          mealPack.items.sort(sortMealPackDays);
          var groupedItems = [];
          var startFromDay = mealPack.items[0].day;
          var groupInd = 0;
          $.each(mealPack.items, function(ind, item){
            if (item.day !== startFromDay) {
              startFromDay = item.day;
              groupInd++;
            }
            groupedItems[groupInd] = groupedItems[groupInd] || [];
            groupedItems[groupInd].push(item);
          });
          mealPack.items = groupedItems;
        });
        function sortMealPackDays(a, b) {
          if (a.day < b.day){
            return -1;
          }
          if (a.day > b.day){
            return 1;
          }
          return 0;
        }
      }

      $cartContainer.append(template(data));

      cartCallback(cart);
      isUpdating = false;
    };

    cartCallback = function (cart) {
      $body.removeClass('drawer--is-loading');
      $body.trigger('ajaxCart.afterCartLoad', cart);
      checkCartDrawerSum(cart.total_price);
      cartDrawerProgressBar(cart);
      checkSavedDeliveryInfo();
     /* bannerPerCity();*/
      checkWM360MealsPack(cart);
    };

    adjustCart = function () {
      // Delegate all events because elements reload with the cart

      // Add or remove from the quantity
      $body.on('click', '.ajaxcart__qty-adjust', function () {
        if (isUpdating || $(this).hasClass('ajaxcart__qty--remove-configurator')) {
          return;
        }
        var $el = $(this),
            line = $el.data('line');

        if ($el.hasClass('ajaxcart__qty--remove')) {
          var $qtySelector = $el.closest('.ajaxcart__product').find('.ajaxcart__qty-num'),
              qtyMax = parseInt($qtySelector.attr('max')),
              qty = parseInt($qtySelector.val().replace(/\D/g, ''));
        } else {
          var $qtySelector = $el.siblings('.ajaxcart__qty-num'),
              qtyMax = parseInt($qtySelector.attr('max')),
              qty = parseInt($qtySelector.val().replace(/\D/g, ''));
        }

        qty = validateQty(qty);

        // Add or subtract from the current quantity
        if ($el.hasClass('ajaxcart__qty--plus')) {
          qty += 1;
          if (qtyMax != undefined && qty >= qtyMax) qty = qtyMax;
        } else {
          qty -= 1;
          if (qty <= 0) qty = 1;
        }

        if ($el.hasClass('ajaxcart__qty--remove')) {
          qty = 0;
        }

        // If it has a data-line, update the cart.
        // Otherwise, just update the input's number
        if (line) {
          updateQuantity(line, qty);
          $qtySelector.val(qty).trigger('change');
        } else {
          $qtySelector.val(qty);
        }
      });

      $body.on('click', '.ajaxcart__qty--remove-configurator', function (e) {
        e.preventDefault();
        if (isUpdating) {
          return;
        }
        var $el = $(this),
            qntArray = [],
            uniqId = $el.attr('data-uniqId-item'),
            itemsRemove = $('.ajaxcart__qty--remove');
        itemsRemove.each(function (i) {
          var element = $(this);
          if (element.attr('data-uniqId-item') != undefined && element.attr('data-uniqId-item') == uniqId) {
            qntArray.push(0);
            var $row = $('.ajaxcart__row[data-line="' + element.attr('data-line') + '"]').addClass('is-loading');
            $row.parent().addClass('is-removed');
          } else {
            qntArray.push(parseInt(element.attr('data-qty')));
          }
        });

        isUpdating = true;
        setTimeout(function () {
          ShopifyAPI.updateItemById(qntArray, adjustCartCallback);
        }, 50);
      });

      // Update quantity based on input on change
      $body.on('change', '.ajaxcart__qty-num', function () {
        if (isUpdating) {
          return;
        }
        var $el = $(this),
            line = $el.data('line'),
            qty = parseInt($el.val().replace(/\D/g, '')),
            qtyMax = parseInt($el.attr('max'));

        qty = validateQty(qty);
        if (qtyMax != undefined && qty >= qtyMax) qty = qtyMax;

        // If it has a data-line, update the cart
        if (line) {
          updateQuantity(line, qty);
        }
      });

      // Prevent cart from being submitted while quantities are changing
      $body.on('submit', 'form.ajaxcart', function (evt) {
        if (isUpdating) {
          evt.preventDefault();
        }
      });

      // Highlight the text when focused
      $body.on('focus', '.ajaxcart__qty-adjust', function () {
        var $el = $(this);
        setTimeout(function () {
          $el.select();
        }, 50);
      });

      function updateQuantity(line, qty) {
        isUpdating = true;

        // Add activity classes when changing cart quantities
        var $row = $('.ajaxcart__row[data-line="' + line + '"]').addClass('is-loading');

        if (qty === 0) {
          $row.parent().addClass('is-removed');
        }

        // Slight delay to make sure removed animation is done
        setTimeout(function () {
          ShopifyAPI.changeItem(line, qty, adjustCartCallback);
        }, 50);
      }

      // Save note anytime it's changed
      $body.on('change', 'textarea[name="note"]', function () {
        var newNote = $(this).val();

        // Update the cart note in case they don't click update/checkout
        ShopifyAPI.updateCartNote(newNote, function () {
        });
      });

      $body.on('click', 'a[aria-controls="CartDrawer"]', function (e) {
        e.preventDefault();
        loadCart();
      });

      $('.gf_add-to-cart').on('click', function(e) {
        e.stopImmediatePropagation();
      });
      $body.on('click', '.remove-meal-pack-btn', function(e){
        e.preventDefault();
        if (isUpdating || $(this).hasClass('ajaxcart__qty--remove-configurator')) {
          return;
        }
        var mealPackId = $(this).attr('data-meal-pack-id');
        removeMealPack(mealPackId);
      });
      $body.off('click', '.ajaxcart__meal-pack-view-items');
      $body.on('click', '.ajaxcart__meal-pack-view-items', function(){
        $(this).closest('.ajaxcart__meal-pack').find('.ajaxcart__meal-pack-items').slideToggle(300);
        $(this).toggleClass('opened');
      });

    };

    removeMealPack = function(mealPackId) {
      isUpdating = true;
      var cartQntArray = [];
      $.ajax({
        type:     'GET',
        url:      '/cart.js',
        dataType: 'json',
        success:  function (cart) {
          for (var i = 0; i < cart.items.length; i++) {
            if (cart.items[i].properties && cart.items[i].properties['_meal_pack_uniq_id'] === mealPackId) {
              cartQntArray.push(0);
            }
            else {
              cartQntArray.push(cart.items[i].quantity)
            }
          }
          $.ajax({
            type:     'POST',
            url:      '/cart/update.js',
            data:     {updates: cartQntArray},
            dataType: 'json',
            success:  function (updatedCart) {
              adjustCartCallback(updatedCart);
            },
            error:    function (XMLHttpRequest, textStatus) {
              ShopifyAPI.onError(XMLHttpRequest, textStatus);
            }
          });
        }
      });
    };

    adjustCartCallback = function (cart) {
      // Update quantity and price
      updateCountPrice(cart);

      // Reprint cart on short timeout so you don't see the content being removed
      setTimeout(function () {
        ShopifyAPI.getCart(buildCart);
      }, 400);
    };

    validateQty = function (qty) {
      if (parseFloat(qty) === parseInt(qty) && !isNaN(qty)) {
        // We have a valid number!
      } else {
        // Not a number. Default to 1.
        qty = 1;
      }
      return qty;
    };

    createProgressDot = function (){
      let dot_count = $('.progress-bar__block-dot').length,
          dot_width = 100 / dot_count;

      $('.progress-bar__block-dot').css({'width': dot_width+'%'});

    };

    cartDrawerProgressBar = function (cart){
      createProgressDot();
      let total = cart.total_price,
          total_point = 0,
          count_point = 0,
          percent_color,
          dot_count = $('.progress-bar__block-dot').length,
          dot_width = 100 / dot_count;

     let array_gifts = [];
      $('.progress-bar__block-dot').each(function () {
        let element = $(this);
        total_point ++;

        let gift = {};

        gift['sum'] = element.data('gift-sum');

        if(element.data('gift-product')){
          gift['id'] = element.data('gift-product');
        }else{
          gift['id'] = 0;
        }

        array_gifts.push(gift);

        if(element.data('gift-sum')*1 < total*1 + 1){
          element.addClass('unlocked');
          count_point ++;
          if(element.data('gift-product')){
            let gift_id = element.data('gift-product'),
                gift_block = '.gift-block-'+gift_id;
            $(gift_block).removeClass('locked');
          }
        }
      });

      let gifts = array_gifts.filter(function (el) {
        return el.id > 0;
      });

      checkDrawerGifts(gifts, total, cart.items);

      if(total_point == count_point){
        percent_color = '100%';
      }else if(count_point<1){
        let to_next_point = $('.progress-bar__block-dot').first().data('gift-sum');
        percent_color = (total*dot_width/to_next_point) + '%';
      }else {
        let sum_for_point = $('.progress-bar__block-dot').eq(count_point-1).data('gift-sum'),
            sum_for_next_point = $('.progress-bar__block-dot').eq(count_point).data('gift-sum'),
            to_next_point = sum_for_next_point*1 - sum_for_point*1,
            more_than_point = total - sum_for_point*1;

        percent_color = (dot_width * count_point) + (more_than_point*dot_width/to_next_point) + '%';
      }

      $('.progress-bar__stripe').css({'background': 'linear-gradient(90deg, rgb(251, 176, 59) 0%, rgb(244, 0, 9) '+ percent_color +', rgb(238, 238, 238) '+ percent_color +', rgb(238, 238, 238) 100%)'});
    };

    checkDrawerGifts = function(gifts, total, items){

      let gifts_need_too_add = gifts.filter(function(gift){
        let item = items.find(function (el) {
          return el.id == gift.id;
        });
        return gift.sum < total+1 && !item
      });

      if(gifts_need_too_add.length>0){
        giftsProgressBarAdd(gifts_need_too_add);
      }

      let gifts_need_too_remove = gifts.filter(function(gift){
        let item = items.find(function (el) {
          return el.id == gift.id;
        });
        return gift.sum > total && item
      });

      if(gifts_need_too_remove.length>0){
        giftsProgressBarRemove(gifts_need_too_remove);
      }

      let gifts_need_too_change_count = gifts.filter(function(gift){
        let item = items.find(function (el) {
          return el.id == gift.id;
        });
        return gift.sum < total+1 && item && item.quantity > 1
      });

      if(gifts_need_too_change_count.length>0){
        giftsProgressBarCount(gifts_need_too_change_count);
      }

    };

    giftsProgressBarAdd = function(products){
      let products_update = {};
      for(let i = 0; products.length> i; i++){
        let this_id = products[i].id;
        products_update[this_id] = 1;
      }

      cartGiftsUpdate(products_update);
    };

    giftsProgressBarRemove = function(products){
      let products_update = {};
      for(let i = 0; products.length> i; i++){
        let this_id = products[i].id;
        products_update[this_id] = 0;
      }

      cartGiftsUpdate(products_update);
    };

    giftsProgressBarCount = function(products){
      let products_update = {};
      for(let i = 0; products.length> i; i++){
        let this_id = products[i].id;
        products_update[this_id] = 1;
      }

      cartGiftsUpdate(products_update);
    };

    cartGiftsUpdate = function(products_update){
      $.ajax({
        method: "POST",
        url: '/cart/update.js',
        dataType: "json",
        data: {updates: products_update},
        success: function (cart) {
          buildCart(cart);
        },
        error: function(XMLHttpRequest, textStatus) {
          console.log(textStatus);
          console.log(XMLHttpRequest);
        }
      })
    };

    module = {
      init: init,
      load: loadCart
    };

    return module;
  })(ajaxCart || {}, jQuery);

  $('#CartDrawer').on('submit','form', function(event) {
    event.preventDefault();
  });

  $(document).ready(function() {
    ajaxCart.init({
      formSelector: 'form[action^="/cart/add"]',
      cartContainer: '#CartContainer',
      addToCartSelector: '.add-to-cart-plan',
      enableQtySelectors: true,
      moneyFormat: theme.moneyFormat
    });

    $('.js-drawer-open-button-right').click(function () {
      setTimeout(slate.cart.openDrawer(), 400);
    });

    $('.drawer__close-button').click(function () {
      closeCartDrawer();
    });
  });

  function forCheckSavedInfo(data){
    $("#CartDrawer").on("click", ".cart-drawer-delivery button", function (e){
      e.preventDefault();
      showDeliveryForm();
      $(".drawer__back-button").addClass('active');
      if($("#CartDrawer footer").hasClass('has-location')){
        setDelivery(data);
      }
    }).on("click", ".cart-drawer-button-continue", function (e) {
      e.preventDefault();
      closeCartDrawer();
      if (!$('body').hasClass('template-collection') || !$('body').hasClass('template-product')){
        document.location.href = "/collections/menu";
      }
    });
  }

  function setDelivery(data){
    if($('#CartDrawer footer').hasClass('has-delivery')){
      setDeliveryRegion(data)
      setDeliveryFullInfo();
    }else{
      setDeliveryRegion(data);
    }
  }

  function setDeliveryRegion(data){
    let delivery_details = localStorage.getItem('wm_d_l'),
        delivery_region_text = removeСomma(delivery_details),
        general_info = data.general,
        regions = data.regions,
        kitchen_time_zone = general_info.time,
        general_delivery_hours = general_info.hours,
        cutoff_time = general_info.cutoff_time;
    searchRegion(delivery_details, regions, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time);
    $('#drawer__cart-input').val(delivery_region_text);
  }

  function setDeliveryFullInfo() {
    let day = localStorage.getItem('wm_d_d'),
        time = localStorage.getItem('wm_d_t'),
        purchase = localStorage.getItem('wm_d_p'),
        frequency = localStorage.getItem('wm_d_f');

    purchase != "false" ? (
        purchase = 1,
            $('.cart--available-frequency-weeks').removeClass('hide'),
            changeChecked("frequency-weeks", frequency)
    )  : purchase = 0;

    changeChecked("delivery-date", day);
    changeChecked("delivery-hours", time);
    changeChecked("delivery-purchase", purchase);
  }

  function changeChecked(name, value){
    let collection = $('input[name="'+name+'"]');
    let count_input_checked = 0;
    for( let i=0; collection.length > i; i++){
      let element = collection[i];
      $(element).removeProp('checked').attr('checked', false);

      if($(element).val() == value){
        $(element).attr('checked', true).prop('checked', true);
        count_input_checked ++;
      }
    }
    if(count_input_checked < 1){
      collection.first().attr('checked', true).prop('checked', true);
    }
  }

  function closeCartDrawer(){
    $('.drawer').removeClass('js-drawer-open-right');
    $('body').removeClass('js-drawer-open active-pop-up');
    $('.cart-drawer-button-continue').addClass('hide');
    $('.drawer__cart-delivery').addClass('hide');
    $('.ajaxcart__inner').removeClass('hide');
    $('.drawer__cart-empty').addClass('hide');
    $('.drawer__container').removeClass('static-footer');
    checkProductsInCart();

    if($('.delivery-input-region input').val() != ''){
      continueCartDrawerInfo();
    }

    if( $('body').hasClass('single-product')){
      theme.Product.custom.checkProductVariantsInCart();
      $('.product-form-wrapper').removeClass('hidden');
    }
  };

  $('.drawer__back').on('click', '.drawer__back-button.active', function () {
    if($('.delivery-input-region input').val() != ''){
      continueCartDrawerInfo();
    }
    $(this).removeClass('active');
    $('.cart-drawer-button-continue').addClass('hide');
    $('.drawer__cart-delivery').addClass('hide');
    $('.ajaxcart__inner').removeClass('hide');
    $('.drawer__cart-empty').addClass('hide');
    $('.drawer__container').removeClass('static-footer');
    $('.cart-drawer-delivery button').removeClass('hide');
    checkSavedDeliveryInfo();
  });

  var arr_week = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      arr_monthes = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      all_regions = [],
      all_delivery_places = [];

  function cartDrawerDelivery(all_info) {
    let general_info = all_info.general,
        regions = all_info.regions,
        kitchen_time_zone = general_info.time,
        general_delivery_hours = general_info.hours,
        cutoff_time = general_info.cutoff_time;

    for (let i = 0; regions.length > i; i++) {
      all_regions.push(regions[i]['name']);
    }
    for (let i = 0; i < regions.length; i++) {
      let places_arr = regions[i]['places'];
      for (let j = 0; j < places_arr.length; j++) {
        all_delivery_places.push(places_arr[j]);
      }
    }
    searchPlaces(all_delivery_places, regions, kitchen_time_zone, general_delivery_hours, cutoff_time);
  }

  function searchPlaces(data, regions, kitchen_time_zone, general_delivery_hours, cutoff_time){
    $('#drawer__cart-input').on('input', function () {
      if( $(this).val().length > 2 ){
        let input_val = $(this).val().toLowerCase();
        if(data.length != undefined && data.length>0){
          $(".drawer__cart-regions").html('');
          let count_li = 0;
          for(let i = 0; data.length>i; i++){
            let content =  removeСomma(data[i]);
            if(content.toLowerCase().indexOf(input_val) != -1){
              let li_val = removeСomma(data[i]);
              $('.drawer__cart-regions').append('<li class="delivery_place" data-place="'+data[i]+'"><span></span>'+li_val+'</li>');
              count_li++;
            }
          }
          if(count_li>0){
            $('.drawer__cart-regions').css('display', 'block');
          }else{
            $('.drawer__cart-regions').css('display', 'none');
            $('.drawer__cart-delivery h2').addClass('empty').text("Sorry, it seems we don't delivery to you yet.");
          }
        }
      }else{
        $('.delivery-date-wrapper').addClass('hide');
        $('.drawer__container').removeClass('static-footer');
        $('.drawer__cart-regions').css('display', 'none');
        $('.drawer__cart-delivery h2').text("Check if we deliver to you");
      }
      showBlocPlaces(regions, kitchen_time_zone, general_delivery_hours, cutoff_time);
    });
  }

  function removeСomma(first_str){
    return first_str.replace(/,/ig, '')
  }

  function showBlocPlaces(regions, kitchen_time_zone, general_delivery_hours, cutoff_time){
    $('.drawer__cart-regions > li').on('click',function(){
      let text = $(this).text(),
          delivery_details = $(this).data('place');

      $('.delivery-input-region').data('region-attr', delivery_details);
      $('#drawer__cart-input').val(text);

      searchRegion(delivery_details, regions, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time);

      $('.drawer__cart-regions').css('display', 'none');
      $('.drawer__cart-delivery h2').text("Check if we deliver to you");
      $('.cart-drawer-button-checkout').removeClass('empty-delivery');
    });
  }

  function searchRegion(region_key, regions, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time){
    for (let i=0; i<regions.length; i++){
      if(regions[i]['places'].indexOf(region_key) != -1){
        var region = regions[i];
        if(region.regionDeliverySettings.length > 0){
          perRegionFindDeliveryBlock(region, kitchen_time_zone, delivery_details, cutoff_time);
        }else{
          showDayBlocks(region, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time);
        }
      }
    }
  }

  function perRegionFindDeliveryBlock(region, kitchen_time_zone, delivery_details, cutoff_time){
    sessionStorage.removeItem('sdd_ndd');
    $('#CartDrawer .cart--available-delivery-days').empty();
    $('#CartDrawer').find('.cart--available-delivery-days').removeClass('set-sdd').removeClass('set-ndd');

    var b_day = new Date(),
        booking_day_t_z = getKitchenTime(b_day, kitchen_time_zone);

    if( !sessionStorage.getItem('WM-360-d') || sessionStorage.getItem('WM-360-d')*1 < 1){
      searchSameDeliveryRegionDays(region, booking_day_t_z);
    }

    var booking_day = checkCutoffTime(booking_day_t_z, cutoff_time);
    var booking_day_number = booking_day.getDay();
    var days = [];
    var arr_variants_delivery = region.regionDeliverySettings;

    for( var i= 0; arr_variants_delivery.length > i; i++){

      if(arr_variants_delivery[i].allowed && (arr_variants_delivery[i].cutoff || arr_variants_delivery[i].cutoff == 0) && (arr_variants_delivery[i].delivery || arr_variants_delivery[i].delivery == 0 )){
        var day = [arr_variants_delivery[i].cutoff, arr_variants_delivery[i].delivery];
        days.push(day);
      }

    }

    days = copySorted(days);
    var region_key_count_day_blocks = region.name;

    getDayCutoff(booking_day, days, booking_day_number, kitchen_time_zone, region_key_count_day_blocks);

    setTimeout(function(){
      perRegionShowHoursBlocks(arr_variants_delivery, booking_day_t_z);
     }, 200);

    $('.delivery-date-wrapper input[name="delivery-date"]').change(function(){
      perRegionShowHoursBlocks(arr_variants_delivery, booking_day_t_z);
    });

    $('.drawer__container').addClass('static-footer');
    checkDeliveryPurchase();
  }

  function perRegionShowHoursBlocks(variants_delivery, booking_day_t_z){
   var chosen_day = $('.delivery-date-wrapper input[name="delivery-date"]:checked').attr("data-chosen")*1;
   var delivery_obj_hours;
   console.log(variants_delivery); /*don't delete*/
    for(var i = 0; variants_delivery.length > i; i++){
      var this_delivery = variants_delivery[i].delivery*1;
      var this_day_allowed = variants_delivery[i].allowed;
      if(this_day_allowed && this_delivery*1 === chosen_day){
        var delivery_obj = variants_delivery[i];
        delivery_obj_hours = delivery_obj.deliveryHours;
        perRegionCreateHoursLi(delivery_obj_hours, booking_day_t_z);
      }
    }

    $('.business-hours').removeClass('hide');
  }

  function perRegionCreateHoursLi(delivery_hours, booking_day_t_z){
    $('.business-hours .cart--available-delivery-hours').empty();
    var session_time = localStorage.getItem("wm_d_t");
    var sdd = $('.delivery-date-wrapper input[name="delivery-date"]:checked').attr("data-sdd");
    var ndd = $('.delivery-date-wrapper input[name="delivery-date"]:checked').attr("data-ndd");
    var after_ndd = $('.delivery-date-wrapper input[name="delivery-date"]:checked').attr("data-after-ndd");

    for (let h = 0; delivery_hours.length>h; h++){
      if(delivery_hours[h]){
        let val_title, val_content, checked_param = '';
        if(!sdd && !ndd){
          val_title = delivery_hours[h].title;
          val_content = delivery_hours[h].helpText;
          if(session_time && session_time != '' && session_time == val_title){
            checked_param = 'checked="checked"';
          }
          $('.cart--available-delivery-hours').append('<li>' +
              '<label class="radio-hours">' +
              '<input type="radio" id="delivery-hours-'+h+'" class="delivery-hours left" '+checked_param+' name="delivery-hours" value="'+val_title+'">' +
              '<div class="radio__text"><p>'+val_title+'</p><p>'+val_content+'</p></div>' +
              '</label></li>');
        }else if(delivery_hours[h].sddTitle){
          var time_block_hours = delivery_hours[h].sddCutoff.split(':')[0];
          var time_block_minutes = delivery_hours[h].sddCutoff.split(':')[1];

          var time_block_hours_ndd = delivery_hours[h].nddCutoff.split(':')[0];
          var time_block_minutes_ndd = delivery_hours[h].nddCutoff.split(':')[1];

          /*if(sdd && ((time_block_hours*1 > booking_day_t_z.getHours()*1) || (time_block_hours*1 == booking_day_t_z.getHours()*1 && booking_day_t_z.getMinutes()*1 < time_block_minutes*1))) {
            val_title = delivery_hours[h].sddTitle;

            if (delivery_hours[h].sddHelpText) {
              val_content = delivery_hours[h].sddHelpText;
            } else {
              val_content = '';
            }
          }else */
          if(ndd && after_ndd > 0){
              val_title = delivery_hours[h].sddTitle;

              if(delivery_hours[h].sddHelpText){
                val_content = delivery_hours[h].sddHelpText;
              }else{
                val_content = '';
              }
          }else if(ndd && ((time_block_hours_ndd*1 > booking_day_t_z.getHours()*1) || (time_block_hours_ndd*1 == booking_day_t_z.getHours()*1 && booking_day_t_z.getMinutes()*1 < time_block_minutes_ndd*1))){
            val_title = delivery_hours[h].sddTitle;

            if(delivery_hours[h].sddHelpText){
              val_content = delivery_hours[h].sddHelpText;
            }else{
              val_content = '';
            }
          }

          if(val_title){
            if(session_time && session_time != '' && session_time == val_title){
              checked_param = 'checked="checked"';
            }
            $('.cart--available-delivery-hours').append('<li>' +
                '<label class="radio-hours">' +
                '<input type="radio" id="delivery-hours-'+h+'" class="delivery-hours left" '+checked_param+' name="delivery-hours" value="'+val_title+'">' +
                '<div class="radio__text"><p>'+val_title+'</p><p>'+val_content+'</p></div>' +
                '</label></li>');
          }

        }
      }
    }

    if(session_time && session_time*1 > 0){
    }else{
      $('.cart--available-delivery-hours .radio-hours').first().find('input').attr('checked', 'checked');
    }
  }

  function searchSameDeliveryRegionDays(region, booking_day_t_z, is_after_ndd){
    var region_days = region.regionDeliverySettings;
    var today = booking_day_t_z.getDay()*1;

    if(is_after_ndd){
      var tomorrow1 = today === 6 ? 0 : today + 1;
      var tomorrow = tomorrow1 === 6 ? 0 : today + 1;
    }else{
        var tomorrow = today === 6 ? 0 : today + 1;
    }

    $.each(region_days, function(ind, day){
        if (day.sddAllowed && day.delivery == tomorrow){
          checkSameDayDeliveryTime(region, day, booking_day_t_z, true, is_after_ndd);
        }
           /* if(day.sddAllowed && day.delivery == today){
                checkSameDayDeliveryTime(day, booking_day_t_z);
            }*/
    });

  }

  function checkSameDayDeliveryTime(region, day, booking_day_t_z, is_ndd, is_after_ndd){
    var today_hours = booking_day_t_z.getHours();
    var today_minutes = booking_day_t_z.getMinutes();
    var arr_SDD_time = [];
    var arr_NDD_time = [];

    $.each(day.deliveryHours, function(ind, time_block){
      if(!is_ndd){
        var time_block_hours = time_block.sddCutoff.split(':')[0];
        var time_block_minutes = time_block.sddCutoff.split(':')[1];
      }else{
        if(time_block.nddCutoff){
          var time_block_hours = time_block.nddCutoff.split(':')[0];
          var time_block_minutes = time_block.nddCutoff.split(':')[1];
        }
      }

      if (!time_block.title){
          return;
      }

      if (!is_ndd){
       /* if((time_block_hours*1>today_hours*1) || (time_block_hours*1 == today_hours*1 && today_minutes*1 < time_block_minutes*1)){
          arr_SDD_time.push(time_block);
          arr_NDD_time.push(time_block);
        }*/
      }else if((time_block_hours*1>today_hours*1) || (time_block_hours*1 == today_hours*1 && today_minutes*1 < time_block_minutes*1)){
        arr_NDD_time.push(time_block);
      }

      if(is_after_ndd){
        arr_NDD_time.push(time_block);
      }
    });

    if (arr_NDD_time.length>0){
      var next_day;

      if(!is_after_ndd) {
        next_day = new Date(+booking_day_t_z + 24 * 3600 * 1000);
      }else{
        next_day = new Date(+booking_day_t_z + 48 * 3600 * 1000);
      }
     createNDDBlockDay(arr_NDD_time, next_day, is_after_ndd);
    }else{
       if(!is_after_ndd){
        searchSameDeliveryRegionDays(region, booking_day_t_z, true);
      }
    }

   /* else if(arr_SDD_time.length>0){ Uncomment this when Kitchen will be ready !!!
        createSDDBlockDay(arr_SDD_time, booking_day_t_z);
    }*/

  }

  function createNDDBlockDay(arr_NDD_time, day, is_after_ndd){
    if(!is_after_ndd){
      is_after_ndd = 0;
    }else{
      is_after_ndd = 1;
    }
        var date_day = arr_week[day.getDay()] +', '+ day.getDate() +' '+ arr_monthes[day.getMonth()]+' '+day.getFullYear();
        var visible_date_day = arr_week[day.getDay()].slice(0,3) +',<br>'+ day.getDate() +'<br>'+ arr_monthes[day.getMonth()].slice(0,3);
        var day_checked;
        (arr_NDD_time.length>0)? day_checked = 'checked="checked"': day_checked = '';
        var block_place = $('#CartDrawer').find('.cart--available-delivery-days');

        var ndd_block = '<li><label class="radio-days day-sdd-block">\n' +
            '            <input type="radio" id="delivery-date-ndd" class="delivery-date" ' +day_checked+ ' name="delivery-date" value="'+date_day+'" data-chosen="'+ day.getDay() +'" data-ndd="true" data-after-ndd="'+is_after_ndd+'">\n' +
            '            <div class="radio__text">'+visible_date_day+'</div>\n' +
            '            </label></li>';

        block_place.append(ndd_block);

        if(arr_NDD_time.length>0){
            block_place.addClass('set-ndd');
        }else{
            block_place.removeClass('set-ndd');
            $('#CartDrawer').find('#delivery-date-ndd').parent().parent().addClass('hide');
        }

    if(date_day){
      sessionStorage.setItem('sdd_ndd', date_day);
    }
  }

  function createSDDBlockDay(arr_SDD_time, day){
    var date_day = arr_week[day.getDay()] +', '+ day.getDate() +' '+ arr_monthes[day.getMonth()]+' '+day.getFullYear();
    var day_checked;
    (arr_SDD_time.length>0)? day_checked = 'checked="checked"': day_checked = '';
    var block_place = $('#CartDrawer').find('.cart--available-delivery-days');

    var sdd_block = '<li><label class="radio-days day-sdd-block">\n' +
        '            <input type="radio" id="delivery-date-sdd" class="delivery-date" ' +day_checked+ ' name="delivery-date" value="'+date_day+'" data-chosen="'+ day.getDay() +'" data-sdd="true">\n' +
        '            <div class="radio__text">Same Day</div>\n' +
        '            </label></li>';

      if ($('#delivery-date-ndd').length){
          block_place.prepend(sdd_block);
      }
      else {
          block_place.append(sdd_block);
      }

    if(arr_SDD_time.length>0){
      block_place.addClass('set-sdd');
    }else{
      block_place.removeClass('set-sdd');
      $('#CartDrawer').find('#delivery-date-sdd').parent().parent().addClass('hide');
    }
  }

  function showDayBlocks(region, kitchen_time_zone, general_delivery_hours, delivery_details, cutoff_time){
    var b_day = new Date(),
        booking_day_t_z = getKitchenTime(b_day, kitchen_time_zone);

    var booking_day = checkCutoffTime(booking_day_t_z, cutoff_time);
    var booking_day_number = booking_day.getDay();
    var days = region['days'],
        delivery_hours = region['hours'];
    days = copySorted(days);
    var region_key_count_day_blocks = region.name;

    showHoursBlocks(region, delivery_hours, general_delivery_hours, delivery_details);
    getDayCutoff(booking_day, days, booking_day_number, kitchen_time_zone, region_key_count_day_blocks);
    $('.drawer__container').addClass('static-footer');
    checkDeliveryPurchase();
  }

  function getKitchenTime(client_day, kitchen_time_zone){
    let client_time_zone = new Date().getTimezoneOffset()*(-1),
        time_zone = 0;
    if(+kitchen_time_zone > +client_time_zone){
      time_zone = kitchen_time_zone - client_time_zone;
    }
    return new Date(time_zone*60*1000+ Date.now())
  }

  function checkCutoffTime(booking_day, cutoff_time){
    if(booking_day.getHours()*1 === cutoff_time[0]*1){
      if(booking_day.getMinutes()*1 === cutoff_time[1]*1){
        if(booking_day.getSeconds()*1 > cutoff_time[2]*1){
          booking_day = createNewBookingDay(booking_day);
          return booking_day;
        }else{
          console.log('sec<');
        }
      }else if(booking_day.getMinutes()*1 > cutoff_time[1]*1){
        booking_day = createNewBookingDay(booking_day);
        return booking_day;
      }else{
        return booking_day;
      }
    }else if(booking_day.getHours()*1 > cutoff_time[0]*1){
      booking_day = createNewBookingDay(booking_day);
      return booking_day;
    }else{
      return booking_day;
    }
  }

  function createNewBookingDay(booking_day) {
    let new_booking_day = new Date(booking_day.getTime() + 24*60*60*1000),
        booking_hours = new_booking_day.getHours()*1,
        booking_minutes = new_booking_day.getMinutes()*1 - 1;

    if(booking_hours > 0 ){
      new_booking_day = new Date(new_booking_day.getTime() - booking_hours*60*60*1000);
    }
    if(booking_minutes > 0 ){
      new_booking_day = new Date(new_booking_day.getTime() - booking_minutes*60*1000);
    }
    return new_booking_day
  }

  function copySorted(arr) {
    return arr.slice().sort();
  }

  function showHoursBlocks(region, delivery_hours, general_delivery_hours, delivery_datails){
    createHoursLi(region, delivery_hours, general_delivery_hours, delivery_datails);
    $('.business-hours').removeClass('hide');
  }

  function createHoursLi(region, delivery_hours, general_delivery_hours){
    $('.business-hours li').remove();
    for (let h =0; delivery_hours.length>h; h++){
      if(delivery_hours[h]){
        let val_title = general_delivery_hours[h].title,
            val_content = general_delivery_hours[h].content;
        $('.cart--available-delivery-hours').append('<li>' +
            '<label class="radio-hours">' +
            '<input type="radio" id="delivery-hours-'+h+'" class="delivery-hours left" checked="checked" name="delivery-hours" value="'+val_title+'">' +
            '<div class="radio__text"><p>'+val_title+'</p><p>'+val_content+'</p></div>' +
            '</label></li>');
      }
    }
  }

  function getDayCutoff(booking_day, days, booking_day_number, kitchen_time_zone, region_key_count_day_blocks) {
    for (let y = 0; arr_week.length > y; y++) {
      let resCheckCutoff = checkCutoff(booking_day_number, days),
          str = '0, 1, 2, 3, 4, 5, 6';
      if (str.indexOf(resCheckCutoff) == -1) {
        booking_day_number += 1;
        if (booking_day_number > 6) {
          booking_day_number = 0;
        }
        checkCutoff(booking_day_number, days);
      } else {
        var next_cutoff_day = checkCutoff(booking_day_number, days);
        getAllCutoffs(next_cutoff_day, kitchen_time_zone, days, region_key_count_day_blocks);
        break;
      }
    }
  }

  function checkCutoff(booking_day_number, days){
    for (let d = 0; d<days.length; d++){
      if((booking_day_number*1) == (days[d][0]*1)){
        return days[d][0];
      }
    }
  }

  function getAllCutoffs(next_cutoff_day, kitchen_time_zone, days, region_key_count_day_blocks){
    let arr_7_days_regions = ['MEL METRO', 'MELBOURNE REGIONAL', 'BNE METRO', 'SYDNEY', 'SYD REGIONAL', 'SYD SOUTHWEST', 'GOLD COAST'];

    let arr_cutoff = [],
        arr_delivery = [];
    for(let k =0; k<days.length; k++){
      arr_cutoff.push(days[k][0]);
      arr_delivery.push(days[k][1]);
    }

    let booking_day = new Date(),
        booking_day_number = booking_day.getDay();
    let day_1_key = arr_cutoff.indexOf(next_cutoff_day);
    let special_b_d = 0;
    if (arr_delivery[day_1_key]*1 <= booking_day_number*1){
      special_b_d = 7;
    }

    if(sessionStorage.getItem('WM-360-d') && sessionStorage.getItem('WM-360-d')*1 > 0) {
      if (arr_delivery[day_1_key] * 1 - booking_day_number * 1 + special_b_d < 5) {
        (day_1_key + 1) < days.length ? (day_1_key = day_1_key + 1) : (day_1_key = 0);
        if (arr_delivery[day_1_key]*1 <= booking_day_number*1){
          special_b_d = 7;
        }
        if (arr_delivery[day_1_key] * 1 - booking_day_number * 1 + special_b_d < 5) {
          (day_1_key + 1) < days.length ? (day_1_key = day_1_key + 1) : (day_1_key = 0);
          if (arr_delivery[day_1_key]*1 <= booking_day_number*1){
            special_b_d = 7;
          }
          if (arr_delivery[day_1_key] * 1 - booking_day_number * 1 + special_b_d < 5) {
            (day_1_key + 1) < days.length ? (day_1_key = day_1_key + 1) : (day_1_key = 0);
            if (arr_delivery[day_1_key]*1 <= booking_day_number*1){
              special_b_d = 7;
            }
            if (arr_delivery[day_1_key] * 1 - booking_day_number * 1 + special_b_d < 5) {
              (day_1_key + 1) < days.length ? (day_1_key = day_1_key + 1) : (day_1_key = 0);
              if (arr_delivery[day_1_key]*1 <= booking_day_number*1){
                special_b_d = 7;
              }
              if (arr_delivery[day_1_key] * 1 - booking_day_number * 1 + special_b_d < 5) {
                (day_1_key + 1) < days.length ? (day_1_key = day_1_key + 1) : (day_1_key = 0);
                if (arr_delivery[day_1_key]*1 <= booking_day_number*1){
                  special_b_d = 7;
                }
                if (arr_delivery[day_1_key] * 1 - booking_day_number * 1 + special_b_d < 5) {
                  (day_1_key + 1) < days.length ? (day_1_key = day_1_key + 1) : (day_1_key = 0);
                  if (arr_delivery[day_1_key]*1 <= booking_day_number*1){
                    special_b_d = 7;
                  }
                }
              }
            }
          }
        }
      }
    }

    let day_2_key,
        day_3_key;
    (day_1_key + 1) < days.length ? ( day_2_key = day_1_key + 1) : ( day_2_key = 0);
    (day_2_key + 1) < days.length ? ( day_3_key = day_2_key + 1) : ( day_3_key = 0);

    let cutoff_change = getCutoffData(booking_day_number, next_cutoff_day);
    /*holidays*/
    /*let holidays_change = 0;
    let holiday_day = new Date(cutoff_change + Date.now()).getDate();
    let holiday_month = new Date(cutoff_change + Date.now()).getMonth();

    if(holiday_day == 27 && holiday_month == 11){
      holidays_change = 7*24*60*60*1000;
    }else if(holiday_day == 30 && holiday_month == 11){
      holidays_change = 4*24*60*60*1000;
    }
    let first_cuttof_h = new Date("2021/01/03");
    let first_cuttof_h_day = 0;
    let cut_delivery_change = 0;*/

    var sdd_ndd = sessionStorage.getItem('sdd_ndd');

    var special_change_wm_360 = 0;

    let first_delivery_change = getDaliveryData(next_cutoff_day, arr_delivery[day_1_key]);

    var first_ms_day = first_delivery_change + cutoff_change + Date.now();

    if(arr_7_days_regions.indexOf(region_key_count_day_blocks.toUpperCase()) > -1){
      var day_4_key, day_5_key, day_6_key;
      (day_3_key + 1) < days.length ? ( day_4_key = day_3_key + 1) : ( day_4_key = 0);
      (day_4_key + 1) < days.length ? ( day_5_key = day_4_key + 1) : ( day_5_key = 0);
      (day_5_key + 1) < days.length ? ( day_6_key = day_5_key + 1) : ( day_6_key = 0);
      var arr_value_all_days = [day_1_key, day_2_key, day_3_key, day_4_key, day_5_key, day_6_key];
      fullDaysFoundData(arr_value_all_days, first_ms_day, arr_delivery, sdd_ndd);
    }else{
      var arr_value_all_days = [day_1_key, day_2_key, day_3_key];
      fullDaysFoundData(arr_value_all_days, first_ms_day, arr_delivery, sdd_ndd);
    }
  }

  function fullDaysFoundData(arr_value_all_days, first_ms_day, arr_delivery, sdd_ndd){
    var arr_ms_delivery_day = [first_ms_day];
    $.each(arr_value_all_days, function(ind, day_key){
      if(ind > 0){
        var change_delivery = getDaliveryData(arr_delivery[arr_value_all_days[ind-1]], arr_delivery[arr_value_all_days[ind]]);
        arr_ms_delivery_day.push(change_delivery + arr_ms_delivery_day[ind-1] );
      }
    });

    $.each(arr_ms_delivery_day, function(i, day_ms){
      var full_date_Date = new Date(day_ms);
      addDayToDaysBlock(full_date_Date, i, sdd_ndd);
    });

    $('.delivery-date-wrapper').removeClass('hide');
    $('.cart-drawer-button-checkout').removeClass('empty-delivery');
  }

  function addDayToDaysBlock(full_date_Date, i, sdd_ndd){
    var checked = "";
    if( !sdd_ndd && i < 1 ){
      checked = "checked";
    }
    var day_value = arr_week[full_date_Date.getDay()] +', '+ full_date_Date.getDate() +' '+ arr_monthes[full_date_Date.getMonth()]+' '+full_date_Date.getFullYear();
    var hide_same_day;
    if(day_value == sdd_ndd){
      hide_same_day = ' class="hide"';
      $('#CartDrawer .cart--available-delivery-days').addClass('after-ndd');
    }else{
      hide_same_day = '';
    }
    var block_day = '<li'+hide_same_day+'><label class="radio-days">' +
        '<input type="radio" id="delivery-date-'+i+'" '+checked+' class="delivery-date" name="delivery-date" ' +
        'value="'+day_value+'" ' +
        'data-chosen="'+full_date_Date.getDay()+'">' +
        '<div class="radio__text">'+arr_week[full_date_Date.getDay()].slice(0,3) +',<br>'+ full_date_Date.getDate() +'<br>'+ arr_monthes[full_date_Date.getMonth()].slice(0,3)+'</div></label></li>';
    $('#CartDrawer .cart--available-delivery-days').append(block_day);
  }

  function getCutoffData(previous_day, next_day){
    let change;
    (+previous_day > +next_day) ?
        ( change = 7 +  next_day - previous_day ) :
        ( change = next_day - previous_day );
    return change*24*60*60*1000;
  }

  function getDaliveryData(previous_day, next_day){
    let change;
    (+previous_day >= +next_day) ?
        ( change = 7 +  next_day - previous_day ) :
        ( change = next_day - previous_day );
    return change*24*60*60*1000;
  }

  function createValueDays(arr_value_days) {
    let val_block_1 = arr_week[arr_value_days[0].getDay()] +', '+ arr_value_days[0].getDate() +' '+ arr_monthes[arr_value_days[0].getMonth()],
        val_block_2 = arr_week[arr_value_days[1].getDay()] +', '+ arr_value_days[1].getDate() +' '+ arr_monthes[arr_value_days[1].getMonth()],
        val_block_3 = arr_week[arr_value_days[2].getDay()] +', '+ arr_value_days[2].getDate() +' '+ arr_monthes[arr_value_days[2].getMonth()];

    let val_1 = val_block_1+' '+arr_value_days[0].getFullYear(),
        val_2 = val_block_2+' '+arr_value_days[1].getFullYear(),
        val_3 = val_block_3+' '+arr_value_days[2].getFullYear();

    let chosen_day_1 = arr_value_days[0].getDay(),
        chosen_day_2 = arr_value_days[1].getDay(),
        chosen_day_3 = arr_value_days[2].getDay();
    daysValue(val_block_1, val_block_2, val_block_3, val_1, val_2, val_3, chosen_day_1, chosen_day_2, chosen_day_3);
  }

  function daysValue(val_block_1, val_block_2, val_block_3, val_1, val_2, val_3, chosen_day_1, chosen_day_2, chosen_day_3) {
    $('#delivery-date-0').val(val_1).attr('data-chosen', chosen_day_1).next('.radio__text').text(val_block_1);
    $('#delivery-date-1').val(val_2).attr('data-chosen', chosen_day_2).next('.radio__text').text(val_block_2);
    $('#delivery-date-2').val(val_3).attr('data-chosen', chosen_day_3).next('.radio__text').text(val_block_3);
    $('.delivery-date-wrapper').removeClass('hide');
    $('.cart-drawer-button-checkout').removeClass('empty-delivery');
  }

  function checkDeliveryPurchase(){
    let value = $('input[name="delivery-purchase"]:checked').val()*1;
    if(value > 0 ){
      $('.cart--available-frequency-weeks').removeClass('hide');
    }else{
      $('.cart--available-frequency-weeks').addClass('hide');
    }
  }

  function checkCartDrawerSum(total){
    let min_sum = window.theme.minOrderSum*100,
        cart_drawer = $('#CartDrawer');
    if(total < min_sum){
      cart_drawer.find('.cart-drawer-button-checkout').attr('disabled', true).addClass('disabled-button');
      cart_drawer.find('.active-checkout').addClass('hide');
      cart_drawer.find('.disable-checkout').removeClass('hide');
    }else{
      cart_drawer.find('.cart-drawer-button-checkout').attr('disabled', false).removeClass('disabled-button');
      cart_drawer.find('.active-checkout').removeClass('hide');
      cart_drawer.find('.disable-checkout').addClass('hide');
    }
  }

  $('#CartDrawer').on('change', 'input[name="delivery-purchase"]', function () {
    checkDeliveryPurchase();
  }).on('click', '.cart-drawer-clear-all button', function (e) {
    $.ajax({
      method: "POST",
      url: "/cart/clear.js",
      success: function (cart) {
        $('.drawer__cart-empty').removeClass('hide');
        $('.drawer__cart').addClass('hide');
        $('.drawer__count').addClass('hide');
        slate.cart.cartIconCount();
        checkProductsInCart();
      },
      error: function (xhr){
        console.log(xhr.responseText);
      }
    });
  });

  function drawerButtonCheckout(data){
    $('#CartDrawer').on('click', '.cart-drawer-button-checkout', function (e) {
      e.preventDefault();

      if ($(this).hasClass('empty-delivery')) {
        if ($('#CartDrawer footer').hasClass('has-location')) {
          showDeliveryForm();
          setDeliveryRegion(data);
        } else {
          showDeliveryForm();
        }
        $(".drawer__back-button").addClass('active');
      } else {
        if($('.buy-more__product').length > 0){
          $('.cart-drawer__buy-more').addClass('active');
          $('#CartDrawer').addClass('hide-for-buy-more');
        }else {
          if($('.gifts-block__gift').length > 0){
            checkProgressBarGifts();
          }else{
            showDrawerSpinner();
            setDrawerAttributes();
            $('.drawer__count').addClass('hide');
          }
        }
      }
    })
  }

  function showDeliveryForm() {
    $('.cart-drawer-button-continue').removeClass('hide');
    $('.cart-drawer-delivery button').addClass('hide');
    $('.drawer__cart-delivery').removeClass('hide');
    $('.ajaxcart__inner').addClass('hide');
  }

  function continueCartDrawerInfo(){
    let delivery_day = $('input[name="delivery-date"]:checked').val(),
        delivery_hours = $('input[name="delivery-hours"]:checked').val(),
        delivery_details = $('.delivery-input-region').data('region-attr'),
        subscription_value = $('input[name="delivery-purchase"]:checked').val()*1,
        subscription,
        frequency_value = $('input[name="frequency-weeks"]:checked').val(),
        frequency;

    subscription_value>0 ? (
        subscription = true,
            frequency = frequency_value
    )  : (
        subscription = false,
            frequency = false
    );
    let attributes = {
      delivery_day: delivery_day,
      delivery_hours: delivery_hours,
      delivery_location: delivery_details,
      delivery_details: delivery_details,
      subscription_value_radio: subscription_value,
      cart_subscription: subscription,
      frequency_weeks: frequency
    };

    if(delivery_details){
      slate.cart.setDeliverylocalStorage(attributes);
    }
  }

  function setDrawerAttributes(){
    let delivery_day,
        delivery_hours,
        delivery_details,
        subscription_value_radio,
        subscription_value,
        frequency_value,
        attributes,
        save_time,
        time_now = new Date().getTime(),
        is_next_day_delivery,
        is_same_day_delivery,
        cart_has_special_meal_pack = (sessionStorage.getItem('WM-360-d')*1 > 0) ? true : false;

    if ($('.ajaxcart__inner').hasClass('hide')) {
      delivery_day = $('input[name="delivery-date"]:checked').val(),
          delivery_hours = $('input[name="delivery-hours"]:checked').val(),
          delivery_details = $('.delivery-input-region').data('region-attr'),
          subscription_value_radio = $('input[name="delivery-purchase"]:checked').val() * 1,
          frequency_value = $('input[name="frequency-weeks"]:checked').val();

      subscription_value_radio > 0 ? subscription_value = true : (
          subscription_value = false,
              frequency_value = false
      );
    }else{
      delivery_details = localStorage.getItem("wm_d_l");
      save_time = localStorage.getItem("wm_d_l_t");
      delivery_day = localStorage.getItem("wm_d_d");
      if(!delivery_details){
        $('.cart-drawer-button-checkout').addClass('empty-delivery');
        showDeliveryForm();
      }

      if(delivery_day && save_time > time_now) {
        delivery_hours = localStorage.getItem("wm_d_t");
        subscription_value = localStorage.getItem("wm_d_p");
        frequency_value = localStorage.getItem("wm_d_f");
        subscription_value_radio = localStorage.getItem("wm_d_p_c");
      }else{
        localStorage.removeItem('wm_d_d');
        localStorage.removeItem('wm_d_t');
        localStorage.removeItem('wm_d_p_c');
        localStorage.removeItem('wm_d_p');
        localStorage.removeItem('wm_d_f');
        $('.cart-drawer-button-checkout').addClass('empty-delivery');
        showDeliveryForm();
      }
    }

    ($('input[name="delivery-date"]:checked').attr('data-sdd')) ? is_same_day_delivery = true : is_same_day_delivery = false;
    ($('input[name="delivery-date"]:checked').attr('data-ndd')) ? is_next_day_delivery = true : is_next_day_delivery = false;

    attributes = {
      delivery_day: delivery_day,
      delivery_hours: delivery_hours,
      delivery_location: delivery_details,
      delivery_details: delivery_details,
      subscription_value_radio: subscription_value_radio,
      cart_subscription: subscription_value,
      frequency_weeks: frequency_value,
      is_same_day_delivery: is_same_day_delivery,
      is_next_day_delivery: is_next_day_delivery,
      wm360: cart_has_special_meal_pack
    };

    slate.cart.setDeliverylocalStorage(attributes);

    $.post("/cart/update.js", {
      "attributes": attributes
    }).done(function() {
      closeDrawerSpinner();
      closeCartDrawer();
      document.location.href = "/checkout"; // checkProductProperties(subscription_value_radio); this function will be used when we decide to add Shopify scripts, please don't delete!!!
    }).fail(function(e) {
      console.log(e);
    });

  }

  function checkProductProperties(subscription_value_radio){
    if(!subscription_value_radio || subscription_value_radio < 1){
      checkOneTimeProperties();
    }else{
      checkSubscriptionProperties();
    }
  }

  function checkSavedDeliveryInfo(){
    let location = localStorage.getItem("wm_d_l"),
        save_time = localStorage.getItem("wm_d_l_t"),
        subscription_value_radio,
        day,
        time,
        // purchase,
        frequency,
        button = $('#CartDrawer').find('footer'),
        time_now = new Date().getTime();

    if (location){
      button.find('.drawer-button-area').text(removeСomma(location)+'.');
      button.addClass('has-location');
      button.find('.change-region').removeClass('hide');
      $('.delivery-input-region').data('region-attr', location);
    }

    if(save_time > time_now){
      day = localStorage.getItem("wm_d_d");
      time = localStorage.getItem("wm_d_t");
      // purchase = localStorage.getItem("wm_d_p");
      frequency = localStorage.getItem("wm_d_f");
      subscription_value_radio = localStorage.getItem('wm_d_p_c');

      if(!day || !time){
        showDeliveryForm();
      }else{
        button.addClass('has-delivery');
        button.find('.drawer-button-date').text(day+'.');
        button.find('.drawer-button-hours').text(time+'.');
        if(subscription_value_radio > 0 && frequency*1 > 1){
          button.find('.drawer-button-subscription').text('Every 2 weeks.');
        }else if(subscription_value_radio > 0 && frequency*1 === 1){
          button.find('.drawer-button-subscription').text('Every week.');
        }else{
          button.find('.drawer-button-subscription').text('One time.');
        }
        $('.cart-drawer-button-checkout').removeClass('empty-delivery');
      }
    }else{
      localStorage.removeItem('wm_d_d');
      localStorage.removeItem('wm_d_t');
      localStorage.removeItem('wm_d_p');
      localStorage.removeItem('wm_d_f');
      localStorage.removeItem('wm_d_p_c');
    }
  }

  function checkSubscriptionProperties(){
    var for_prop_check = 0,
        first_item_qty;
    $.getJSON('/cart.js', function (cart) {
      for(var i=0; cart.items.length>i; i++){
        if(cart.items[i].properties && (cart.items[i].properties['_subscription'] == "true" || cart.items[i].properties['_subscription'] == 'true')) {
          document.location.href = "/checkout";
        } else {
          for_prop_check += 1;
        }
      }

      if (cart.items.length === for_prop_check){
        first_item_qty = cart.items[0].quantity;
        updateC(first_item_qty);
      }
    });
  }

  function checkOneTimeProperties(){
    $.getJSON('/cart.js', function (cart) {
      propertiesInCart(cart);
    });
  }

  function propertiesInCart(cart){
    var for_one_check = 0,
        item_key,
        item_qty;
    for(var i=0; cart.items.length>i; i++){
      if(cart.items[i].properties && (cart.items[i].properties['_subscription'] == "true" || cart.items[i].properties['_subscription'] == 'true')){
        item_key = cart.items[i].id;
        item_qty = cart.items[i].quantity;
        for_one_check +=1;
      }
    }

    if(for_one_check === 1){
      updateCId(item_key, item_qty);
    }else{
      document.location.href = "/checkout";
    }
  }

  function updateCId(item, qty) {
    var product_del = {};
    product_del[item]=0;

    $.post('/cart/update.js',
        {updates: product_del})
        .done(function() {
          productOneTime(qty, item);
        }).fail(function(e) {
      console.log(e);
    });
  }

  function productOneTime(qty, item) {
    $.post('/cart/add.js', {
      items: [
        {
          quantity: qty,
          id: item,
          properties: {
            '_subscription': false
          }
        }
      ]
    }).done(function(cart) {
      document.location.href = "/checkout";
    }).fail(function(e) {
      console.log(e);
    })
  }

  function updateC(qty){
    $.post('/cart/change.js', {
      line: 1,
      quantity: qty,
      properties: {
        '_subscription': 'true'
      }
    }).done(function() {
      document.location.href = "/checkout";
    }).fail(function(e) {
      console.log(e);
    });
  }

  function showDrawerSpinner() {
    $('.custom-spinner-drawer').removeClass('hide');
    $('#CartDrawer').addClass('active-spinner');
    $('#CartContainer').addClass('hide');
    $('.drawer__cart-delivery').addClass('hide');
  }

  function closeDrawerSpinner() {
    $('.custom-spinner-drawer').addClass('hide');
    $('#CartDrawer').removeClass('active-spinner');
    $('#CartContainer').removeClass('hide');
  }

  var prev_path = document.referrer,
      this_path = window.location.pathname;

  if(( prev_path.indexOf('/cart')>0 || prev_path.indexOf('/checkouts')>0 ) && this_path.indexOf('/menu')>0){
    ajaxCart.init({
      formSelector: 'form[action^="/cart/add"]',
      cartContainer: '#CartContainer',
      // CartRecommendsContainer: '#CartRecommends',
      addToCartSelector: '.add-to-cart-plan',
      enableQtySelectors: true,
      moneyFormat: theme.moneyFormat
    });

    closeDrawerSpinner();
    $("a.header-cart").trigger( "click" );
    slate.cart.openDrawer();
  }else if (prev_path.indexOf('/cart')>0 && this_path.indexOf('/menu')>0){
    ajaxCart.init({
      formSelector: 'form[action^="/cart/add"]',
      cartContainer: '#CartContainer',
      // CartRecommendsContainer: '#CartRecommends',
      addToCartSelector: '.add-to-cart-plan',
      enableQtySelectors: true,
      moneyFormat: theme.moneyFormat
    });

    $("a.header-cart").trigger( "click" );
    slate.cart.openDrawer();
  }else{
    closeDrawerSpinner();
    closeCartDrawer();
  }
}
/*===============================================
* single-product.js
* ================================================*/
if( $('body').hasClass('single-product')){
  loadProduct();
  checkProductVariantsInCart();
}

function loadProduct(){
  let nutritions_obj_product = {
    "protein": 0,
    "white_first": 0.2,
    "carbs": 0,
    "white_second": 0.2,
    "fat": 0,
    "white_third": 0.2,
  };

  nutritions_obj_product['protein'] = $('.product-section .block-full-protein td:nth-child(2) span').text()*1;
  nutritions_obj_product['carbs'] = $('.product-section .block-full-carbohydrate td:nth-child(2) span').text()*1;
  nutritions_obj_product['fat'] = $('.product-section .block-full-fat-total td:nth-child(2) span').text()*1;

  circleGraph(nutritions_obj_product, "nutritionCanvasProduct");
  lineGraph(nutritions_obj_product);
}

function checkProductVariantsInCart(){
  theme.Product.custom.checkProductVariantsInCart();
}

function changeVariantSingleProduct(variant){
  let nutritions_obj_product = {
    "protein": 0,
    "white_first": 0.2,
    "carbs": 0,
    "white_second": 0.2,
    "fat": 0,
    "white_third": 0.2,
  };
  nutritions_obj_product['protein'] = $(variant).data('protein')*1;
  nutritions_obj_product['carbs'] = $(variant).data('carbohydrate')*1;
  nutritions_obj_product['fat'] = $(variant).data('fat_total')*1;

  circleGraph(nutritions_obj_product, "nutritionCanvasProduct");
  lineGraph(nutritions_obj_product);
}

function getFullNutritionProduct(variant){
  let product_nutrition = {
        'block-full-calories' : $(variant).data('calories'),
        'block-full-energy' : $(variant).data('energy'),
        'block-full-protein' : $(variant).data('protein'),
        'block-full-fat-total' : $(variant).data('fat_total'),
        'block-full-saturated-fat' : $(variant).data('saturated_fat'),
        'block-full-carbohydrate' : $(variant).data('carbohydrate'),
        'block-full-sugar' : $(variant).data('sugar'),
        'block-full-sodium' : $(variant).data('sodium')
      },
      product_part_nutrition = {
        'block-full-calories' : $(variant).data('part-calories'),
        'block-full-energy' : $(variant).data('part-energy'),
        'block-full-protein' : $(variant).data('part-protein'),
        'block-full-fat-total' : $(variant).data('part-fat_total'),
        'block-full-saturated-fat' : $(variant).data('part-saturated_fat'),
        'block-full-carbohydrate' : $(variant).data('part-carbohydrate'),
        'block-full-sugar' : $(variant).data('part-sugar'),
        'block-full-sodium' : $(variant).data('part-sodium')
      };

  changeVariantSingleProductNutrition(product_nutrition, 2);
  changeVariantSingleProductNutrition(product_part_nutrition, 3);
}

function changeVariantSingleProductNutrition(nutrition_obj, position){
  let arr_keys = Object.keys(nutrition_obj);

  for(let i=0; arr_keys.length>i; i++){
    let element = arr_keys[i],
        row = $('table.all-nutrition-block').find('.'+element);
    row.find('td:nth-child('+ position +') span').text(nutrition_obj[element]);
  }
}

$('.product-section').on('click', '.product-variants button', function(){
  $('.product-variants button').each(function () {
    $(this).removeClass('active');
  });

  let variant = $(this),
      new_count = variant.data('qty');
  variant.addClass('active');

  $('.product-info__price').text(variant.data('price'));
  $('.calories-count span').text(variant.data('calories'));
  if(new_count>0){
    $('.product-content-count').removeClass('hide').find('.product-count').text(new_count);
    $('.product-content-add').addClass('hide');
  }else{
    $('.product-content-count').addClass('hide').find('.product-count').text(0);
    $('.product-content-add').removeClass('hide');
  }

  changeVariantSingleProduct(variant);
  getFullNutritionProduct(variant);
}).on('click', '.product-content-add', function(){
  let element = $(this),
      id = $('.product-variant.active').data('variant-id'),
      count = $('.variant-'+id).data('qty')*1 + 1;

  addProduct(id);
  element.addClass('hide');
  element.parent().find('.product-content-count').removeClass('hide').find('.product-count').text(count);
  $('.variant-'+id).data('qty', count);
}).on('click', '.product-add', function () {
  let element = $(this),
      id = $('.product-variant.active').data('variant-id'),
      count = element.prev('span').text()*1 + 1;
  element.prev('span').text(count);
  $('.variant-'+id).data('qty', count);
  addProduct(id);
}).on('click', '.product-remove', function () {
  let element = $(this),
      id = $('.product-variant.active').data('variant-id'),
      qty = element.next('span').text()*1;

  if(qty > 1){
    qty -= 1;
  }else{
    qty = 0;
  }

  let params = {
    quantity: qty,
    id: id
  };

  removeProductCart(params);

  $('.variant-'+id).data('qty', qty);
  element.next('span').text(qty);
});


/*================ Templates ================*/
/**
 * Customer Addresses Script
 * ------------------------------------------------------------------------------
 * A file that contains scripts highly couple code to the Customer Addresses
 * template.
 *
 * @namespace customerAddresses
 */

theme.customerAddresses = (function() {
  var $newAddressForm = $('#AddressNewForm');

  if (!$newAddressForm.length) {
    return;
  }

  // Initialize observers on address selectors, defined in shopify_common.js
  if (Shopify) {
    new Shopify.CountryProvinceSelector('AddressCountryNew', 'AddressProvinceNew', {
      hideElement: 'AddressProvinceContainerNew'
    });
  }

  // Initialize each edit form's country/province selector
  $('.address-country-option').each(function() {
    var formId = $(this).data('form-id');
    var countrySelector = 'AddressCountry_' + formId;
    var provinceSelector = 'AddressProvince_' + formId;
    var containerSelector = 'AddressProvinceContainer_' + formId;

    new Shopify.CountryProvinceSelector(countrySelector, provinceSelector, {
      hideElement: containerSelector
    });
  });

  // Toggle new/edit address forms
  $('.address-new-toggle').on('click', function() {
    $newAddressForm.toggleClass('hide');
  });

  $('.address-edit-toggle').on('click', function() {
    var formId = $(this).data('form-id');
    $('#EditAddress_' + formId).toggleClass('hide');
  });

  $('.address-delete').on('click', function() {
    var $el = $(this);
    var formId = $el.data('form-id');
    var confirmMessage = $el.data('confirm-message');
    if (confirm(confirmMessage || 'Are you sure you wish to delete this address?')) {
      Shopify.postLink('/account/addresses/' + formId, {parameters: {_method: 'delete'}});
    }
  });
})();

/**
 * Password Template Script
 * ------------------------------------------------------------------------------
 * A file that contains scripts highly couple code to the Password template.
 *
 * @namespace password
 */

theme.customerLogin = (function() {
  var config = {
    recoverPasswordForm: '#RecoverPassword',
    hideRecoverPasswordLink: '#HideRecoverPasswordLink'
  };

  if (!$(config.recoverPasswordForm).length) {
    return;
  }

  checkUrlHash();
  resetPasswordSuccess();

  $(config.recoverPasswordForm).on('click', onShowHidePasswordForm);
  $(config.hideRecoverPasswordLink).on('click', onShowHidePasswordForm);

  function onShowHidePasswordForm(evt) {
    evt.preventDefault();
    toggleRecoverPasswordForm();
  }

  function checkUrlHash() {
    var hash = window.location.hash;

    // Allow deep linking to recover password form
    if (hash === '#recover') {
      toggleRecoverPasswordForm();
    }
  }

  /**
   *  Show/Hide recover password form
   */
  function toggleRecoverPasswordForm() {
    $('#RecoverPasswordForm').toggleClass('hide');
    $('#CustomerLoginForm').toggleClass('hide');
  }

  /**
   *  Show reset password success message
   */
  function resetPasswordSuccess() {
    var $formState = $('.reset-password-success');

    // check if reset password form was successfully submited.
    if (!$formState.length) {
      return;
    }
    // show success message
    $('#ResetSuccess').removeClass('hide');
  }
})();

/* General Events On Collection page  */
checkProductsInCart();

function checkProductsInCart(){
  $.getJSON('/cart.js', function (cart) {
    let arr_id = [],
        arr_qty =[];
    for (var j = 0; cart.items.length > j; j++) {
      arr_id.push(cart.items[j].id);
      arr_qty.push(cart.items[j].quantity);
    }

    $('.product-variants > span').each(function () {
      let product_variant = $(this),
          product_variant_id = product_variant.data('variant-id') * 1,
          check = $(product_variant).prev('span');

      product_variant.removeClass('active');

      if(arr_id.indexOf(product_variant_id) >= 0){
        let count = arr_qty[arr_id.indexOf(product_variant_id)];
        product_variant.data("qty", count);
        product_variant.find('.variant-count').html('<span>' + count + '</span>');

        if (check.length < 1) {
          let block = product_variant.parent().next('.content-product-add');
          $(block).find('.product-content-add').addClass('hide');
          $(block).find('.product-content-count').removeClass('hide').find('.product-count').text(count);
          product_variant.addClass('active');
        }
      }else {
        product_variant.data("qty", 0);
        product_variant.find('.variant-count').html('');

        if (check.length < 1) {
          let block = product_variant.parent().next('.content-product-add');
          $(block).find('.product-content-add').removeClass('hide');
          $(block).find('.product-content-count').addClass('hide').find('.product-count').text(0);
          product_variant.addClass('active');
        }
      }

      if(product_variant.hasClass('active')){
        let value_input_id = $(product_variant).data('variant-id'),
            active_variant = $(product_variant).parent().next('.content-product-add'),
            value_input_qty = $(active_variant).find('.product-content-count').find('.product-count').text();
        $(active_variant).find('input#variant').val(value_input_id);
        $(active_variant).find('input#quantity').val(value_input_qty);
      }

    });
  });
}

function cartIcon() {
  slate.cart.cartIconCount();
}

// Actions on product-cart block

$('.collections-wrapper, .collection-products-section, .product-recommendations-wrapper').on('click', '.product-variants span', function(){
  let variant = $(this);
  variant.parent().find('span').removeClass('active');
  setTimeout(changeVariant, 50, variant);
  variant.addClass('active');
}).on('click', '.product-content-add', function(){
  let element = $(this),
      id = element.parent().find('#variant').val(),
      count = element.parent().find('#quantity').val()*1 + 1;
  element.parent().parent().find('.variant-'+id+' .variant-count').html('<span>'+count+'</span>');
  element.addClass('hide');
  element.next('.product-content-count').removeClass('hide').find('.product-count').text(count);

  let span =  element.parent().parent().prev('.product-variants').find('.variant-'+id);
  span.data('qty', count);
  addProduct(id);
}).on('click', '.product-add', function () {
  let element = $(this),
      id = element.parent().parent().find('#variant').val();
  addProduct(id);
  let count = element.prev('span ').text()*1 + 1;
  element.prev('span').text(count);
  let span =  element.parent().parent().prev('.product-variants').find('.variant-'+id);
  span.data('qty', count);
  span.find('.variant-count').removeClass('hide').html('<span>'+count+'</span>');
}).on('click', '.product-remove', function () {
  let element = $(this),
      id = element.parent().parent().find('#variant').val(),
      qty = element.next('span').text()*1;

  if(qty>0){
    qty -= 1;
  }else{
    qty = 0;
  }

  let params = {
    quantity: qty,
    id: id
  };

  removeProductCart(params);

  $('.variant-'+id).data('qty', qty);
  element.next('span').text(qty);

  let span =  element.parent().parent().prev('.product-variants').find('.variant-'+id);
  span.data('qty', qty);
  if(qty>0){
    span.find('.variant-count').html('<span>'+qty+'</span>').removeClass('hide');
  }else{
    span.find('.variant-count').addClass('hide').html('<span>'+qty+'</span>');
  }
});

function blockCountButtons(){
  $('.product-content-add, .product-remove, .product-add').attr('disabled', true);
}

function unblockCountButtons(){
  $('.product-content-add, .product-remove, .product-add').attr('disabled', false);
}

function changeVariant(variant){
  let block_nutrition = variant.parent().parent().parent().find('.product-block-nutrition'),
      next_div = variant.parent().next('div'),
      new_qty = variant.find('.variant-count span').text()*1;

  block_nutrition.find('.calories_count').text(variant.data('calories'));
  block_nutrition.find('.protein_count').text(variant.data('protein'));
  block_nutrition.find('.carbs_count').text(variant.data('carbohydrate'));
  block_nutrition.find('.fat_count').text(variant.data('fat_total'));

  next_div.find('.product-price').text(variant.data('price'));
  next_div.find('#variant').val(variant.data('variant-id'));
  next_div.find('#quantity').val(new_qty);

  if(new_qty > 0){
    next_div.find('.product-content-count').removeClass('hide');
    next_div.find('.product-content-add').addClass('hide');
    next_div.find('.product-content-count .product-count').text(new_qty);
  }else{
    next_div.find('.product-content-count').addClass('hide');
    next_div.find('.product-content-add').removeClass('hide');
  }
}

function addProduct(id){
  blockCountButtons();

  let data = {
    quantity: 1,
    id: id
  };
  if ($('.progress-bar_container').length > 0 && $('body').hasClass('template-collection') && $('body').attr('id') == 'menu') {
    data.properties = {
      '_shop_from': 'menu'
    };
  }
  $.ajax({
    type: 'POST',
    url: '/cart/add.js',
    dataType: 'json',
    data: data,
    success: function() {
      setTimeout(cartIcon, 50);
      unblockCountButtons();
    },
    error: function(XMLHttpRequest, textStatus) {
      console.log(textStatus);
      console.log(XMLHttpRequest);
    }
  });
}

function removeProductCart(params){
  blockCountButtons();
  $.ajax({
    method: "POST",
    url: "/cart/change.js",
    dataType: "json",
    data: params,
    success: function () {
      setTimeout(cartIcon, 50);
      unblockCountButtons();
    },
    error: function(XMLHttpRequest, textStatus) {
      console.log(textStatus);
      console.log(XMLHttpRequest);
    }
  })
}

function productPopUp(data) {
  let nutritions_obj = { // object for canvas
    "protein": 0,
    "white_first": 0.2,
    "carbs": 0,
    "white_second": 0.2,
    "fat": 0,
    "white_third": 0.2,
  };

  $('.collection-page-collection-section, .section-search-results, .collections-wrapper, .product-recommendations-wrapper').on('click', '.product-block-image', function(){
    $('body').addClass('active-pop-up');
    let element = $(this),
        product_id = element.data('block-id') * 1,
        product_qty = [];

    let variants = element.next('div').find('.product-variants>span');

    for(let j=0; variants.length>j; j++){
      let element = variants[j],
          key = $(element).attr('data-variant-id'),
          pass_qty = $(element).find('.variant-count').text();
      product_qty.push([key, pass_qty]);
    }

    for (let i = 0; data.length> i; i++){
      if(product_id === data[i].apiId * 1){
        let title = data[i].title,
            type = data[i].type,
            tags = data[i].tags,
            variants = data[i].variants,
            img = data[i].images,
            nutritions_first = variants[0].nutritions,
            ingredients_first = variants[0].ingredients.join(', '),
            calories_first = variants[0].nutritions.Calories,
            description = data[i].description;

        nutritions_obj['protein'] = nutritions_first.Protein;
        nutritions_obj['carbs'] = nutritions_first.Carbohydrate;
        nutritions_obj['fat'] = nutritions_first.Fat_Total;

        createProduct(title, type, tags, variants, img, nutritions_obj, ingredients_first, calories_first, description, product_qty);
      }
    }
  });

}

function createSmallImage(image){
  let img_small = image.replace('.jpg','_560x.jpg'),
      img_medium = image.replace('.jpg','_790x.jpg'),
      img_large = image.replace('.jpg','_1120x.jpg'),
      full_img = 'srcset="'+ img_small +', '+ img_medium +' 1.5x, '+ img_large +' 2x" ' +
          'src="'+ img_small +'"';
  return full_img;
}

function createProduct(title, type, tags, variants, img, nutritions_obj, ingredients_first, calories_first, description, product_qty) {
  let pop_up = $('.collection-product-pop-up'),
      element = $('.template-product .product-section'),
      img_src = createSmallImage(img[0]),
      image = '<img '+ img_src +' alt="'+ title +'">';

  pop_up.find('h2').html(title);
  pop_up.find('.product-pop-up-img').html(image);
  pop_up.find('.ingredients-content').text(ingredients_first);
  element.find('.ingredients-content').text(ingredients_first);
  pop_up.find('.calories-count span').text(calories_first);
  element.find('.calories-count span').text(calories_first);
  pop_up.find('.description-content').html(description);
  pop_up.find('.product-pop-up-add .price').text('$'+variants[0].price);

  if(type == "Juice" || type == "Farm" || type == "Snack"){
    pop_up.find('.preparation').addClass('hide');
  }else{
    pop_up.find('.preparation').removeClass('hide');
  }

  circleGraph(nutritions_obj, "nutritionCanvas");
  lineGraph(nutritions_obj);
  createFullNutritions(variants[0].nutritions);
  if(variants.length>1){
    createVariantsButtons(variants, product_qty);
  }else{
    /*$('.collection-product-pop-up .product-variants').addClass('hide');*/
    variants[0].title = "REGULAR";
    let active = ' active',
        button = createVariantButton(variants[0], active, product_qty);
    $('.collection-product-pop-up .product-variants').removeClass('hide').html(button);
  }

  if(product_qty[0][1] > 0){
    $('.collection-product-pop-up .product-pop-up-add .add-button').addClass('hide');
    $('.product-pop-up-add .product-content-count').removeClass('hide');
    $('.product-pop-up-add .product-count').text(product_qty[0][1]);
  }else{
    $('.collection-product-pop-up .product-pop-up-add .add-button').removeClass('hide');
    $('.product-pop-up-add .product-content-count').addClass('hide');
    $('.product-pop-up-add .product-count').text(0);
  }
  pop_up.removeClass('hide');
}

function createVariantsButtons(variants, product_qty){
  let block_variants_buttons = '',
      active;

  for(let i=0; variants.length>i; i++ ){
    i === 0 ? active = ' active' : active = '';
    block_variants_buttons += createVariantButton(variants[i], active, product_qty[i]);
  }
  $('.collection-product-pop-up .product-variants').removeClass('hide').html(block_variants_buttons);
}

function createVariantButton(variant, active, product_qty){
  let ingredients_first = variant.ingredients.join(', ');

  return '<button class="product-variant'+ active +'" data-variant-qty="'+product_qty[1]+'" data-variant-price="'+ variant.price + '" data-variant-id="'+ variant.apiId +'" data-variant-ingredients="'+ ingredients_first +'" data-variant-protein="'+ variant.nutritions.Protein +'" data-variant-energy="'+ variant.nutritions.Energy_KJ +'" data-variant-calories="'+ variant.nutritions.Calories +'" data-variant-fat-total="'+ variant.nutritions.Fat_Total +'" data-variant-saturated-fat="'+ variant.nutritions.Saturated_Fat +'" data-variant-carbohydrate="'+ variant.nutritions.Carbohydrate +'" data-variant-sugar="'+ variant.nutritions.Sugar +'" data-variant-sodium="'+ variant.nutritions.Sodium +'" data-variant-fiber="'+ variant.nutritions.Fiber +'" ><span class="variant-count" hidden>0</span>'+ variant.title +'</button>';
}

function circleGraph(nutritions, element_id){
  let nutritionCanvas = document.getElementById(element_id);
  nutritionCanvas.width = 200;
  nutritionCanvas.height = 200;

  let ctx = nutritionCanvas.getContext("2d");

  function drawPieSlice(ctx,centerX, centerY, radius, startAngle, endAngle, color ){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX,centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  }

  let Piechart = function(options){
    this.options = options;
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext("2d");
    this.colors = options.colors;

    this.draw = function(){
      var total_value = 0;
      var color_index = 0;
      for (var categ in this.options.data){
        var val = this.options.data[categ];
        total_value += val;
      }

      var start_angle = 0;
      for (categ in this.options.data){
        val = this.options.data[categ];
        var slice_angle = 2 * Math.PI * val / total_value;

        drawPieSlice(
            this.ctx,
            this.canvas.width/2,
            this.canvas.height/2,
            Math.min(this.canvas.width/2,this.canvas.height/2),
            start_angle,
            start_angle+slice_angle,
            this.colors[color_index%this.colors.length]
        );

        start_angle += slice_angle;
        color_index++;
      }

      //drawing a white circle over the chart
      //to create the doughnut chart
      if (this.options.doughnutHoleSize){
        drawPieSlice(
            this.ctx,
            this.canvas.width/2,
            this.canvas.height/2,
            this.options.doughnutHoleSize * Math.min(this.canvas.width/2,this.canvas.height/2),
            0,
            2 * Math.PI,
            "#FFFFFF"
        );
      }

    }
  }

  let myDougnutNutrition = new Piechart(
      {
        canvas: nutritionCanvas,
        data: nutritions,
        colors:["#F40009","#ffffff","#424242","#ffffff", "#fbb03b","#ffffff"],
        doughnutHoleSize: 0.9
      }
  );

  myDougnutNutrition.draw();
}

function lineGraph(nutritions){
  let protein = nutritions.protein * 1,
      carbs = nutritions.carbs * 1,
      fat = nutritions.fat * 1,
      sum_nutritions = protein + carbs + fat;

  createLineGraph(sum_nutritions, protein, 'protein-number', 'stripe-protein', '215,53,92');
  createLineGraph(sum_nutritions, carbs, 'carbs-number', 'stripe-carbs', '66,66,66');
  createLineGraph(sum_nutritions, fat, 'fat-number', 'stripe-fat', '251,176,59');
}

function createLineGraph(all, piece, class_position, class_line, color_line){
  let part = piece*100/all;
  $('.'+class_line).css({ 'background': 'linear-gradient(90deg, rgba('+ color_line +',1) 0%, rgba('+ color_line +',1) '+ part +'%, rgba(220,220,220,1) '+ part +'%, rgba(220,220,220,1) 100%)'});
  $('.'+class_position+' span:last-child').html(piece+'G');
}

function createFullNutritions(nutritions){
  let pop_up = $('.collection-product-pop-up');
  fullNutrition(nutritions, pop_up, 'block-full-protein', 'Protein', 'g');
  fullNutrition(nutritions, pop_up, 'block-full-energy', 'Energy_KJ', 'KJ');
  fullNutrition(nutritions, pop_up, 'block-full-calories', 'Calories', 'cal');
  fullNutrition(nutritions, pop_up, 'block-full-fat-total', 'Fat_Total', 'g');
  fullNutrition(nutritions, pop_up, 'block-full-saturated-fat', 'Saturated_Fat', 'g');
  fullNutrition(nutritions, pop_up, 'block-full-carbohydrate', 'Carbohydrate', 'g');
  fullNutrition(nutritions, pop_up, 'block-full-sugar', 'Sugar', 'g');
  fullNutrition(nutritions, pop_up, 'block-full-sodium', 'Sodium', 'mg');
  fullNutrition(nutritions, pop_up, 'block-full-fiber', 'Fiber', 'g');
}

function fullNutrition(nutritions, pop_up, p_class, block_key, type){
  let text = nutritions[block_key];
  pop_up.find('.'+p_class+' span').text(text+''+type);
}

$('.collection-product-pop-up .product-variants').on('click', 'button', function () {
  $('.collection-product-pop-up .product-variants button').removeClass('active');
  $('.product-pop-up-add .product-content-count').addClass('hide');
  $('.product-pop-up-add .product-content-count .product-count').text('0');
  $('.collection-product-pop-up .product-pop-up-add .add-button').removeClass('hide');
  let full_data = $(this),
      main_block = $('.main-product-content'),
      nutritions_obj = {
        "protein": 0,
        "white_first": 0.2,
        "carbs": 0,
        "white_second": 0.2,
        "fat": 0,
        "white_third": 0.2,
      },
      full_nutritions = {},
      variant_qty = full_data.data('variant-qty');
  full_data.addClass('active');
  main_block.find('.ingredients-content').text(full_data.data('variant-ingredients'));
  main_block.find('.calories-count span').text(full_data.data('variant-calories'));
  $('.product-pop-up-add .price').text('$'+full_data.data('variant-price'));

  if(variant_qty*1 > 0){
    $('.product-pop-up-add .product-content-count').removeClass('hide');
    $('.product-pop-up-add .product-content-count .product-count').text(variant_qty);
    $('.collection-product-pop-up .product-pop-up-add .add-button').addClass('hide');
  }else{
    $('.product-pop-up-add .product-content-count .product-count').text('0');
  }

  nutritions_obj['protein'] = full_data.data('variant-protein');
  nutritions_obj['carbs'] = full_data.data('variant-carbohydrate');
  nutritions_obj['fat'] = full_data.data('variant-fat-total');

  full_nutritions['Protein'] = full_data.data('variant-protein');
  full_nutritions['Carbohydrate'] = full_data.data('variant-carbohydrate');
  full_nutritions['Fat_Total'] = full_data.data('variant-fat-total');

  full_nutritions['Energy_KJ'] = full_data.data('variant-energy');
  full_nutritions['Calories'] = full_data.data('variant-calories');
  full_nutritions['Saturated_Fat'] = full_data.data('variant-saturated-fat');
  full_nutritions['Sugar'] = full_data.data('variant-sugar');
  full_nutritions['Sodium'] = full_data.data('variant-sodium');
  full_nutritions['Fiber'] = full_data.data('variant-fiber');

  lineGraph(nutritions_obj);
  circleGraph(nutritions_obj, "nutritionCanvas");
  createFullNutritions(full_nutritions);

});

$('.close-collection-popUp').click(function(){
  $('.collection-product-pop-up').addClass('hide');
  $('body').removeClass('active-pop-up');
  $('.all-nutrition-block').fadeOut();
  $('.nutrition-lines button').removeClass('in-block');
  checkProductsInCart();
});

$('.nutrition-lines button').click(function () {
  let element = $(this);
  if( element.hasClass('in-block')){
    $('.all-nutrition-block').fadeOut();
    element.removeClass('in-block');
    element.html("all nutrition facts");
  }else{
    $('.all-nutrition-block').fadeIn();
    element.addClass('in-block');
    element.html("close All Nutrition Facts");
  }
});

/* collection Product block -> Pop Up add to cart */

$('.collection-product-pop-up').on('click', '.product-pop-up-add .add-button', function (){
  $(this).addClass('hide');
  $('.product-pop-up-add .product-content-count').removeClass('hide');

  let variant_button = $('.collection-product-pop-up .product-variant.active'),
      id = variant_button.data('variant-id'),
      qty = $('.product-pop-up-add .product-count').text()*1 + 1;

  addProduct(id);
  $('.product-pop-up-add .product-count').text(qty);
  variant_button.data('variant-qty', qty);
}).on('click', '.product-pop-up-add .product-content-count .product-add', function (){
  let variant_button = $('.collection-product-pop-up .product-variant.active'),
      id = variant_button.data('variant-id'),
      qty = $('.product-pop-up-add .product-count').text()*1 + 1;

  addProduct(id);
  $('.product-pop-up-add .product-count').text(qty);
  variant_button.data('variant-qty', qty);
}).on('click', '.product-pop-up-add .product-content-count .product-remove', function (){
  let variant_button = $('.collection-product-pop-up .product-variant.active'),
      id = variant_button.data('variant-id'),
      qty = $('.product-pop-up-add .product-count').text()*1;

  if(qty > 1){
    qty -= 1;
  }else{
    qty = 0;
  }

  $('.product-pop-up-add .product-count').text(qty);
  if(qty == 0){
    $('.product-pop-up-add .product-content-count').addClass('hide');
    $('.collection-product-pop-up .product-pop-up-add .add-button').removeClass('hide');
  }
  variant_button.data('variant-qty', qty);

  let params = {
    quantity: qty,
    id: id
  };

  removeProductCart(params);
});


/* Collection filters - update */
theme.CollectionFilters = (function(){
  function CollectionFilters(container) {
    var $container = (this.$container = $(container));
    this.initFilters();
  }
  CollectionFilters.prototype = $.extend({}, CollectionFilters.prototype, {
    initFilters: function(){
      var _this = this;
      this.$productGridItems = $('.product-grid-item');
      this.$clearAllFilters = $('.clear-all-filters');
      this.$noFilterResults = $('.no-filter-results');
      this.$filterItems = $('.collection-filter-item');
      this.$adBlocks = $('.ad-grid-item');
      this.$clonedAds = this.$adBlocks.clone().addClass('ad-grid-item-cloned')
      this.$collectionSections = $('.collection-section');

      this.$filterItems.on('click', function(){
        $(this).toggleClass('active-filter');
        _this.filterProducts();
      });

      this.$clearAllFilters.on('click', function(){
        _this.$filterItems.removeClass('active-filter');
        _this.filterProducts();
      });

      $('.collection-filter-btn').on('click', function(){
        var $filter = $(this).closest('.collection-filter');
        $('.collection-filter-open').not($filter).find('.collection-filter-dropdown').slideUp(200);
        $('.collection-filter-open').not($filter).removeClass('collection-filter-open');
        if ($filter.hasClass('collection-filter-has-dropdown')) {
          $filter.toggleClass('collection-filter-open');
          $('.collection-filter-dropdown', $filter).slideToggle(200);
        }
      });

      $('.show-filters').click(function () {
        $('.collection-filters-wrapper').slideToggle(200);
        $('.close-filters').toggle();
      });

      $('.close-filters').click(function () {
        $('.collection-filters-wrapper').slideUp(200);
        $(this).hide();
      });

    },
    filterProducts: function(){
      var _this = this;
      var $activeFilters = $('.active-filter');
      this.$clearAllFilters.hide();
      this.$noFilterResults.hide();
      $('.has-active-filter').removeClass('has-active-filter');
      this.$productGridItems.removeClass('product-filtered');
      $('.ad-grid-item-cloned').remove();
      this.$collectionSections.show();
      if ($activeFilters.length) {
        $activeFilters.closest('.collection-filter').addClass('has-active-filter');
        _this.$clearAllFilters.show();
      }
      else {
        _this.$clearAllFilters.hide();
        this.$productGridItems.fadeIn(300);
        this.$adBlocks.fadeIn(300);
        return;
      }

      this.$productGridItems.hide();
      this.$adBlocks.hide();

      var $activeFiltersGroups = $activeFilters.closest('.collection-filter');
      this.$productGridItems.each(function(){
        var matchFilters = [];
        var $productGridItem = $(this);
        $activeFiltersGroups.each(function(){
          var shouldBeExcepted = $(this).attr('data-exception-rule') === 'true';
          var matchFilter = shouldBeExcepted ? 1 : 0;
          $('.active-filter', $(this)).each(function(){
            var filterValue = $(this).attr('data-filter-value');
            if ($productGridItem.attr('data-tags') != undefined) {
              var productTags = $productGridItem.attr('data-tags').split(',');
              if (productTags.indexOf(filterValue) >= 0) {
                matchFilter = shouldBeExcepted ? 0 : 1;
                return false;
              }
            }
          });
          matchFilters.push(matchFilter);
        });

        if (matchFilters.indexOf(0) < 0) {
          $productGridItem.addClass('product-filtered');
          $productGridItem.fadeIn(300);
        }
      });
      this.$collectionSections.each(function(){
        var $collectionSection = $(this);
        if (!$('.product-filtered', $collectionSection).length) {
          $(this).hide();
        }
      });

      if (!$('.product-filtered').length) {
        this.$clearAllFilters.filter('.clear-all-filters-desktop').hide();
        this.$noFilterResults.show();
      }
      else if ($('.product-filtered').length != this.$productGridItems.length) {
        var adPositionAfterEach = Math.floor($('.product-filtered').length / this.$clonedAds.length);
        if (adPositionAfterEach < 3) {
          adPositionAfterEach = 3;
        }
        this.$clonedAds.each(function(ind){
          $(this).insertAfter($('.product-filtered').eq((ind+1)*adPositionAfterEach - 1)).fadeIn(300);
        });
      }
    }
  });
  return CollectionFilters;
})();
//Script for page search results

function openSearchResults(evt, desc) {
  let i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent__search");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
    tabcontent[i].className = tabcontent[i].className.replace("show", "");
  }
  tablinks = document.getElementsByClassName("tablinks__search");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(desc).style.display = "block";
  document.getElementById(desc).className += " show";
  evt.currentTarget.className += " active";
}

$('.tablinks__search').on('click', function(){
  let tab = "tabcontent-"+ $(this).attr("data-handle");
  openSearchResults(event, tab);
});


$(document).ready(function() {
  var sections = new slate.Sections();
  sections.register('product', theme.Product);
  sections.register('collection-filters', theme.CollectionFilters);
  theme.mealPackProducts.mealPackTest();
  theme.mealPackProducts.mealPackTestResult();
  //theme.mealPackProducts.mealPackAddToCartProducts();
  //theme.mealPackProducts.mealPackChangeProduct();

  sections.register('mealPack', theme.MealPackAjaxSection);

  if (window.theme.cartType === "page") {
    slate.cart.cartChangeQTY();
    slate.cart.cartClear();
    slate.cart.cartCheckTotal();
  }

  // slate.subscriptions.canceledSubscription();

  sections.register('deliveryMap', theme.DeliveryMapSection);

  // Common a11y fixes
  slate.a11y.pageLinkFocus($(window.location.hash));

  $('.in-page-link').on('click', function(evt) {
    slate.a11y.pageLinkFocus($(evt.currentTarget.hash));
  });

  // Target tables to make them scrollable
  var tableSelectors = '.rte table';

  slate.rte.wrapTable({
    $tables: $(tableSelectors),
    tableWrapperClass: 'rte__table-wrapper',
  });

  // Target iframes to make them responsive
  var iframeSelectors =
      '.rte iframe[src*="youtube.com/embed"],' +
      '.rte iframe[src*="player.vimeo"]';

  slate.rte.wrapIframe({
    $iframes: $(iframeSelectors),
    iframeWrapperClass: 'rte__video-wrapper'
  });

  // Apply a specific class to the html element for browser support of cookies.
  if (slate.cart.cookiesEnabled()) {
    document.documentElement.className = document.documentElement.className.replace('supports-no-cookies', 'supports-cookies');
  }

  Slideshow();
  SimpleSlider();
  SlideshowMealpacks();
  SlideArticles();
  SliderRelatedProducts();
  StepsSliderHomepage();
  StepsSliderCopy();
  StepsSliderCopy2();

  SlideshowChannels();

  AboutUsSlider();
  ReviewsSlider();
  BlogSlider();

  goalSlideMale();
  goalSlideFemale();

  //Title fade in and change color
  let duration = 500;
  $(".title-fade-in").each(function(index) {
    //$(this).delay(duration*index).fadeIn(duration);
    $(this).delay(duration * index).animate({
      opacity: 1
    }, duration, function() {
      $(this).delay(duration).css("color", "#010101");
    });
  });

  //Fade in photo description on header slider
  function fadeInDescription() {
    let duration = 700;
    $(".stripe").each(function (index) {
      $(this).delay(duration * index).animate({
        opacity: 1
      }, duration, function () {
        $(this).delay(duration).addClass("stripe-active").css("color", "#010101");
      });
    });
  }

  let delayAnimation = 0.3;
  setTimeout(fadeInDescription, delayAnimation * duration);

  //Tab with collection
  $(".tablinks-collection:eq(0)").addClass("active");
  $(".tabcontent-collection:eq(0)").css("display","block");
  $(".tabcontent-collection:eq(0)").css("opacity","1");

  equalHeight($(".step-title-wrappper"));
  getMarginForSlide($(".meal-packs-section"));

  if ($('.homepage-video-with-mobile').length > 0 && ($('.homepage-video-with-mobile').attr('src-webm-mob') != ''
      || $('.homepage-video-with-mobile').attr('src-mp4-mob') != ''
      || $('.homepage-video-with-mobile').attr('src-ogg-mob') != '')){
    videoConteinerSource($(window).width());
  }

});

// Tabs height alignment
function equalHeight(group) {
  let tallest = 0;
  group.each(function() {
    let thisHeight = $(this).height();
    if(thisHeight > tallest) {
      tallest = thisHeight;
    }
  });
  group.height(tallest);
}

function getMarginForSlide(elem){
  let heigthDots = elem.find(".slick-dots").outerHeight(),
      marginElem = 32,
      generalMargin = marginElem + heigthDots + "px";

  elem.find(".meal-pack").css("margin-top", generalMargin);
}

$(window).resize(function() {
  getMarginForSlide($(".meal-packs-section"));
});

$('.co-worker_all').on('click', function (e) {
  $(this).fadeOut();
  setTimeout(function () {
    $('.hidden--co-worker').slideDown(500);
  }, 450);
});

/*popUp buy more*/
$('.cart-drawer__buy-more').on('click', '.product-content-add', function (){
  let add_button = $(this),
      add_block = add_button.parent(),
      id = add_button.parent().data('product-id'),
      qty = add_button.parent().find('.product-count').text()*1 + 1;

  add_button.addClass('hide');
  add_block.find('.product-content-count').removeClass('hide');

  addMoreProduct(id);

  add_block.find('.product-count').text(qty);

}).on('click', '.product-add', function (){
  let add_button = $(this),
      add_block = add_button.parent().parent(),
      id = add_block.data('product-id'),
      qty = add_block.find('.product-count').text()*1 + 1;

  addMoreProduct(id);

  add_block.find('.product-count').text(qty);

}).on('click', '.product-remove', function (){
  let remove_button = $(this),
      remove_block = remove_button.parent().parent(),
      id = remove_block.data('product-id'),
      qty = remove_block.find('.product-count').text()*1;

  if(qty > 1){
    qty -= 1;
  }else{
    qty = 0;
  }

  remove_block.find('.product-count').text(qty);

  if(qty == 0){
    remove_block.find('.product-content-count').addClass('hide');
    remove_button.removeClass('hide');
  }

  let params = {
    quantity: qty,
    id: id
  };

  removeProductCart(params);
});

function addMoreProduct(id){
  let data = {
    quantity: 1,
    id: id
  };

  $.ajax({
    type: 'POST',
    url: '/cart/add.js',
    dataType: 'json',
    data: data,
    success: function() {
      setTimeout(cartIcon, 50);
      $('.cart-drawer__buy-more footer .buy-more__close').text('checkout');
    },
    error: function(XMLHttpRequest, textStatus) {
      console.log(textStatus);
      console.log(XMLHttpRequest);
    }
  });
}

$('.cart-drawer__buy-more').on('click', '.buy-more__close', function (){
  $('.cart-drawer__buy-more').removeClass('active');
  $('#CartDrawer').removeClass('hide-for-buy-more');

  if($('.gifts-block__gift').length > 0){
    checkProgressBarGifts();
  }else{
    showDrawerSpinner();
    setDrawerAttributes();
    $('.drawer__count').addClass('hide');
  }
});

function checkProgressBarGifts(){
  ShopifyAPI.getCart(checkProgressGifts);
};

function checkProgressGifts(data){
  let total = data.total_price,
      arr_gifts = [];
  $('.gifts-block__gift').each(function () {
    let id = $(this).data('gift-variant-id'),
        sum = $(this).data('gift-variant-sum'),
        obj = {};

    obj['id'] = id;
    obj['sum'] = sum;
    arr_gifts.push(obj);
  });
  checkGiftArr(data, arr_gifts, total);
}

function checkGiftArr(data, arr_gifts, total){
  if(arr_gifts.length < 1){
    showDrawerSpinner();
    setDrawerAttributes();
    $('.drawer__count').addClass('hide');
  }else{
    let gift = arr_gifts.shift(),
        gift_sum = gift.sum;

    for(let i = 0; data.items.length > i; i++){
      let variant_id = data.items[i].variant_id;
      if(variant_id*1 == gift.id*1 ){
        let item = data.items[i];
        checkGiftCount(item, gift_sum, total, arr_gifts, data);
      }else{
        checkGiftArr(data, arr_gifts, total);
      }
    }
  }
}

function checkGiftCount(gift, sum, total, arr_gifts, data){
  let id = gift.variant_id,
      qty = gift.quantity;

  if(sum*1 > total*1){
    $.ajax({
      type: 'post',
      url: '/cart/update.js',
      data: "updates["+id+"]=0",
      success: function(data){
        checkGiftArr(data, arr_gifts, total);
      },
      dataType: 'json',
      error: function (d) {
        console.log(d.responseText);
      }
    });
  }else if(qty > 1 ){
    $.ajax({
      type: 'post',
      url: '/cart/update.js',
      data: "updates["+id+"]=1",
      success: function(data){
        checkGiftArr(data, arr_gifts, total);
      },
      dataType: 'json',
      error: function (d) {
        console.log(d.responseText);
      }
    });
  }else{
    checkGiftArr(data, arr_gifts, total);
  }
}

/*================ Section city Banner ================*/

bannerPerCity();

function bannerPerCity() {
  let city_name;
  $.ajax({
      url: "https://geoip-db.com/jsonp",
      jsonpCallback: "callback",
      dataType: "jsonp",
      success: function( location ) {
        let city_code = location.postal;
        findBannerName(city_code);
        city_code = location.city.toLowerCase();
        if(!city_code){
          city_name = 'main';
          let city_class = 'banner-city-main';
          changeCityBanner(city_class);
          changeDrawerBanner(city_class);
          sessionStorage.setItem('banner-code', city_name);
        }
      },
    error: function () {
      let city_class = 'banner-city-main';
      changeCityBanner(city_class);
      changeDrawerBanner(city_class);
    }
    });
};

function findBannerName(city_code){
  let city_name = searchInCode(city_code);
  let city_class = 'banner-city-'+city_name;
  changeCityBanner(city_class);
  changeDrawerBanner(city_class);
  sessionStorage.setItem('banner-code', city_name);
}

function searchInCode(city_code){
  let city_name;
  let banners_code = window.theme.bannersCode;
  for(let i = 0; banners_code.length> i; i++){
    let block_codes = banners_code[i][1];
    if(block_codes.length>0 && block_codes.split(',').indexOf(city_code)>-1){
      city_name = banners_code[i][0];
    }
  }
  if(!city_name){
    city_name = 'main';
  }
  return city_name;
}

function changeCityBanner(city_class){
  if($('body').hasClass('template-index') && $('.shopify-section.city-banner').length>0 && $('.'+city_class).length>0){
    $('.city-banner section').addClass('hide');
    $('.city-banner .'+city_class).removeClass('hide');
  }else if($('body').hasClass('template-index') && $('.shopify-section.city-banner').length>0){
    $('.city-banner section').addClass('hide');
    $('.city-banner .banner-city-main').removeClass('hide');
  }
}

function changeDrawerBanner(city){
  let city_class = 'drawer-'+city;

  if($('#CartDrawer .cart-drawer--city-banner').length>0 && $('#CartDrawer .cart-drawer--city-banner').find('.'+city_class).length>0 ){
    $('#CartDrawer .cart-drawer--city-banner img').addClass('hide');
    $('#CartDrawer .cart-drawer--city-banner .'+city_class).removeClass('hide');
  }
}

/*================ Page WM-360 video ================*/
window.addEventListener('DOMContentLoaded', function() {
  if (document.querySelectorAll(".video-autoplay-block").length > 0) {
    document.querySelectorAll(".video-autoplay-block")[0].play();
  }
});

if(document.querySelectorAll('.wm-360-main__video .video-play, .wm-360-video .video-play').length > 0){
  document.querySelectorAll('.wm-360-main__video .video-play, .wm-360-video .video-play')[0].addEventListener('click', function(el) {
    let video = this.previousElementSibling;
    video.play();
    video.classList.add('video-play-active');
  });

  document.querySelectorAll('.wm-360-main__video video, .wm-360-video video')[0].addEventListener('click', function(el) {
    let video = this;
    if(this.classList.contains('video-play-active')){
      video.pause();
      video.classList.remove('video-play-active');
    }
  });

  document.querySelectorAll('.wm-360-main__video .video-sound-off, .wm-360-video .video-sound-off')[0].addEventListener('click', function(el) {
    let button = this;
    let button_on = this.previousElementSibling;
    button.classList.add('hide');
    button_on.classList.remove('hide');
    button.parentNode.querySelector('video').muted = true;
  });
  document.querySelectorAll('.wm-360-main__video .video-sound-on, .wm-360-video .video-sound-on')[0].addEventListener('click', function(el) {
    let button = this;
    let button_off = this.nextElementSibling;
    button.classList.add('hide');
    button_off.classList.remove('hide');
    button.parentNode.querySelector('video').muted = false;
  });
}
/*================ Page WM-360 form ================*/
$('.wm-360-buy-meals-pack button').click(function(){
  $('.wm-360-buy-meals-pack button').attr('disabled', true);
  let button = $(this);
  let variant_id = button.data('variant');
  let analytics_url = button.parent().parent().parent().parent().data('from');
  let data = {
    quantity: 1,
    id: variant_id,
    properties: {'wm360': 'meal-pack'}
  };

  $.ajax({
    type: 'POST',
    url: '/cart/add.js',
    dataType: 'json',
    data: data,
    success: function() {
      if(window.ga){
     //   ga('create', 'UA-34707600-1', 'auto');
        ga('set', 'dimension2', analytics_url );
// Send the custom dimension value with a pageview hit.
        ga('send', 'event', 'Button', 'add_to_cart', analytics_url);
      //  ga('send', 'event', 'dimension2', 'set', analytics_url);
      }
      button.find('span').last().addClass('hide');
      button.find('span').first().removeClass('hide');
      $('.wm-360-buy-meals-pack button').attr('disabled', false);
      setTimeout(cartIcon, 50);
      $('.header-cart.js-drawer-open-button-right').trigger("click");
      setTimeout(function () {
        returnButtonTitle(button);
      }, 3000)
    },
    error: function(XMLHttpRequest, textStatus) {
      console.log(textStatus);
      console.log(XMLHttpRequest);
    }
  });
});

function returnButtonTitle(button){
  button.find('span').first().addClass('hide');
  button.find('span').last().removeClass('hide');
}

function checkWM360MealsPack(cart){
  let hide_one_time = 0;
  let drawer = $('#CartDrawer');
  $.each(cart.items, function (index, item) {
    if(item.properties['wm360']){
      hide_one_time ++;
    }
  });
  if(hide_one_time > 0){
    drawer.find('input[name="delivery-purchase"]').last().attr('checked', true);
    drawer.find('input[name="delivery-purchase"]').first().attr('checked', false);
    drawer.find('input[name="frequency-weeks"]').first().attr('checked', true);
    drawer.find('input[name="frequency-weeks"]').last().attr('checked', false);
    drawer.find('.cart--available-purchase-type').css('display', 'none');
    drawer.find('.cart--available-frequency-weeks').css('display', 'none');
    drawer.find('.cart--available-purchase-type').prev('h3').css('display', 'none');
    drawer.find('.delivery-date-wrapper h3').first().text("WM360 & Delivery start date");
    sessionStorage.setItem('WM-360-d', '1');
  }else{
    drawer.find('.cart--available-purchase-type').css('display', 'block');
    drawer.find('.cart--available-frequency-weeks').css('display', 'flex');
    drawer.find('.cart--available-purchase-type').prev('h3').css('display', 'block');
    drawer.find('.delivery-date-wrapper h3').first().text("Delivery date");
    sessionStorage.setItem('WM-360-d', '');
  }
}

$('.template-page-workout-meals-360 a[href="#open_form"]').click(function(e){
  e.preventDefault();
  $('.pop-up-wm-360-form').removeClass('hide');
  $('body').addClass('active-pop-up');

  var calendar_id = $(".pop-up-wm-360-form").find("#general-question__datepicker");
  var time_id = $(".pop-up-wm-360-form").find("#general-question__timepicker");

  datePickerHome(calendar_id, time_id);
  timePickerHome(time_id);
});

$('.template-page-workout-meals-360 a[href="#wm-360-buy-pack"]').click(function(event){
  event.preventDefault();
  $('html, body').animate({
    scrollTop: $(".wm-360-buy-meals-pack").offset().top - 100
  }, 700);
});

$('.pop-up-wm-360-form').on('click', 'header button, .btn-close-form', function(){
  $('.pop-up-wm-360-form').addClass('hide');
  $('body').removeClass('active-pop-up');
});

$('.pop-up-wm-360-form').on('click', '.btn-save-form', function(){
  let button = $(this);
  if($('.pop-up-wm-360-form').hasClass('static-form')){
    let pop_up = $('.pop-up-wm-360-form.static-form');
    checkFirstFormRequired(pop_up);
  }else{
    let pop_up = $(this).parent().parent().find('.first-section-questions');
    button.attr("disabled", true);
    if(!$('.pop-up-wm-360-form .first-section-questions').hasClass('hide')){
      checkFirstFormRequired(pop_up);
    }else{
      checkAllAnswersRequired(pop_up);
    }
  }
});

$('.pop-up-wm-360-form').on('change keyup input click', 'input[type="number"]', function(){
  let input_value = $(this).val();
  input_value = input_value.replace(/[^0-9]/g, '');
  if(input_value.length > 3){
    input_value = input_value.substr(0, 3);
  }
  $(this).val(input_value);
});

$('.pop-up-wm-360-form').on('change keyup input click', 'input', function(){
  $('.pop-up-wm-360-form').find('.btn-save-form').attr('disabled', false);
});

$('.pop-up-wm-360-form').on('change keyup input click', '.general-question__name input, .general-question__last-name input', function(){
  let input_value = $(this).val();
  input_value = input_value.replace(/[^A-z/-]/g, '');
  if(input_value.length > 20){
    input_value = input_value.substr(0, 20);
  }
  $(this).val(input_value);
});

$('.pop-up-wm-360-form').on('change keyup input click', '.general-question__phone input', function(){
  let input_value = $(this).val();
  input_value = input_value.replace(/[^0-9/+]/g, '');
  if(input_value.length > 20){
    input_value = input_value.substr(0, 20);
  }
  $(this).val(input_value);
});

function datePickerHome(calendar_id) {
  var min_day = new Date(new Date().getTime() + 24*60*60*1000);
  var text_day_day = (min_day.getDate() < 10 ) ? '0'+min_day.getDate() : min_day.getDate();
  var text_day_month = (min_day.getMonth()*1+1 < 10) ? '0'+(min_day.getMonth()*1+1) : min_day.getMonth()*1+1 ;
  var text_day = min_day.getFullYear()+'-'+text_day_month+'-'+text_day_day;

  $(calendar_id).val(text_day);

  $( calendar_id ).datepicker({
    dateFormat: 'yy-mm-dd',
    minDate: min_day,
    maxDate: "+2m",
    defaultDate: min_day,
    beforeShowDay: function(date){
      var dayOfWeek = date.getDay();
      if (dayOfWeek == 0 || dayOfWeek == 6){
        return [false];
      } else {
        return [true];
      }
    }
  });

  $(window).resize(function(){
    $( calendar_id ).datepicker("hide");
  });
}

function timePickerHome(time_id) {
  $(time_id).timepicker({
    timeFormat: 'h:mm p',
    interval: 60,
    minTime: '10:00am',
    maxTime: '05:00pm',
    defaultTime: '10:00am',
    startTime: '10:00am',
    dynamic: true,
    dropdown: true,
    scrollbar: false
  });
}

function checkFirstFormRequired(pop_up){
  let required_field_count = 0;
  pop_up.find('input').each(function(){
    if($(this).hasClass('required-input')){
      if($(this).val().length < 2){
        required_field_count ++;
      }
    }
  });

  if(required_field_count > 0){
    $(pop_up).addClass('checked-required');
  }else{
    if($(pop_up).hasClass('static-form')){
      checkAllAnswersRequired(pop_up)
    }else{
      setFirstPartAnswers(pop_up);
      $(pop_up).removeClass('checked-required');
    }
  }
}

function checkAllAnswersRequired(pop_up) {
  let pop_up_main = pop_up.find('main');
  let required_field_count = 0;

  pop_up_main.find('input').each(function(){
    if($(this).hasClass('required-input')){
      if($(this).val().length < 2){
        required_field_count ++;
      }
    }
  });

  if(required_field_count > 0){
    $(pop_up_main).addClass('checked-required');
  }else{
    if($(pop_up).hasClass('static-form')){
      setFirstPartAnswers(pop_up);
    }else{
      $('.template-page-workout-meals-360 .custom-spinner').removeClass('hide');
      collectFullAnswers(pop_up_main);
    }
    $(pop_up_main).removeClass('checked-required');
  }
}

function setFirstPartAnswers(pop_up){
  let data = {
    results:  {
      first_name : pop_up.find('.general-question__name input').val(),
      last_name : pop_up.find('.general-question__last-name input').val(),
      gender : pop_up.find('.general-question__gender input[name="radio-gender"]:checked').val(),
      age : pop_up.find('.general-question__age input').val(),
      height : pop_up.find('.general-question__height input').val(),
      weight : pop_up.find('.general-question__weight input').val(),
      goal: pop_up.find('.general-question__goal input[name="radio-goal"]:checked').val(),
     // occupation : pop_up.find('.general-question__occupation input').val(),
      goal_handle: pop_up.find('.general-question__goal input[name="radio-goal"]:checked').data('tag'),
      email : pop_up.find('.general-question__email input').val(),
      phone : pop_up.find('.general-question__phone input').val(),
      date_to_call : pop_up.find('.general-question__date input').val(),
      time_to_call : pop_up.find('.general-question__time input').val()
    }
  };

  if(pop_up.hasClass('static-form')){
    $('.template-page-workout-meals-360-form .custom-spinner').removeClass('hide');
    $('body').addClass('active-pop-up');
  }else{
    $('.template-page-workout-meals-360 .custom-spinner').removeClass('hide');
  }
  sentAnswers(data, pop_up);
};

function sentAnswers(data, pop_up){
  $.ajax({
    method: "POST",
    url: "/apps/"+ window.theme.kitchenCentreKey +"/customPlanQuiz",
    dataType: 'json',
    data: JSON.stringify(data),
    success: function (xhr) {
      if(xhr.quiz_id > 0 ){
        if(pop_up.hasClass('static-form')){
          collectFullAnswers(pop_up, xhr.quiz_id);
        }else{
          sessionStorage.setItem('quiz_id', xhr.quiz_id);
          $('.template-page-workout-meals-360 .custom-spinner').addClass('hide');
          showMainAnswersBlock();
        }
      }else if(xhr.success){
        if(pop_up.hasClass('static-form')){
          finishStaticForm();
        }else{
          finishPopUpForm();
        }
      }else{
        console.log(xhr);
      }
    },
    error: function (xhr){
      console.log(xhr.responseText);
    }
  });
};

function finishPopUpForm(){
  $('.template-page-workout-meals-360 .custom-spinner').addClass('hide');
  let pop_up = $('.pop-up-wm-360-form');
  pop_up.find('.finish-pop-up-form').removeClass('hide');
  pop_up.find('main').addClass('hide');
  pop_up.find('footer').addClass('hide');
  pop_up.find('header button').click(function(){
    document.location.reload();
  });
}

function showMainAnswersBlock(){
  let pop_up = $('.pop-up-wm-360-form');
  pop_up.find('.first-section-questions').addClass('hide');
  pop_up.find('main').removeClass('hide');
  pop_up.find('.btn-save-form__first').addClass('hide');
  pop_up.find('.btn-save-form__second').removeClass('hide');
  pop_up.find('.btn-save-form').attr('disabled', false);
}

function collectFullAnswers(pop_up, customer){
  var data_custom_results = [];
  let full_questions_block = $('.pop-up-wm-360-form').find('section.all-question');
  let quiz_id = customer || sessionStorage.getItem('quiz_id');

  full_questions_block.find('.all-question__block').each(function(){
    let block = $(this);
    let question_full = block.find('.all-question_question').text();
    let custom_answer_obj = {};
    if(question_full.toLowerCase().indexOf('occupation')> -1){
        question_full = 'occupation';
    }else{
        custom_answer_obj = { question: question_full };
    }

    let answer_full = [];

    if(block.hasClass('text-field')){
      block.find('.answer-text-field').each(function(){
        answer_full.push($(this).val());
      });
    }else if(block.hasClass('button-field')){
      answer_full.push(block.find('input[type="radio"]:checked').val());
      block.find('.answer-text-field').each(function(){
        answer_full.push($(this).val());
      });
    }else if(block.hasClass('checkbox-field')){
      block.find('.all-question__answer-checkboxes input:checked').each(function(){
        answer_full.push($(this).val());
      });

      block.find('.answer-text-field').each(function(){
        answer_full.push($(this).val());
      });
    }

    if(question_full == 'occupation'){
       custom_answer_obj['occupation'] = answer_full;
    }else{
        custom_answer_obj['answers'] = answer_full;
    }

    data_custom_results.push(custom_answer_obj);
  });

  let data =  {quiz_id: quiz_id*1, custom_results: data_custom_results };

  sentAnswers(data, pop_up);
};

/* WM360 Form Page*/
function finishStaticForm() {
    $('.template-page-workout-meals-360-form .custom-spinner').addClass('hide');
    $('body').removeClass('active-pop-up');
    $('.static-form__ready').removeClass('hide');
    if ($('h2.static-form__ready.page-width').length < 1) {
        $('#shopify-section-wm-360-form--banner').after('<h2 class="static-form__ready page-width">Your answers are successfully sent!<br> Our managers will contact you soon.</h2>');
    }
    $('html, body').animate({
        scrollTop: $('#shopify-section-wm-360-form--banner').offset().top * 1 + 100
    }, {
        duration: 370,
        easing: "linear"
    });

    $('.template-page-workout-meals-360-form input[type="number"], .template-page-workout-meals-360-form input[type="text"], .template-page-workout-meals-360-form input[type="phone"], .template-page-workout-meals-360-form input[type="email"]').val('');
}

function onBoardingForm(){
  if($('.pop-up-wm-360-form.static-form')){
    var calendar_id = $(".static-form").find("#general-question__datepicker");
    var time_id = $(".static-form").find("#general-question__timepicker");

    datePickerHome(calendar_id, time_id);
    timePickerHome(time_id);
  }
};

if($('body').hasClass('template-page-workout-meals-360-form')){
  onBoardingForm();
}

/* Collection Goal Meal-pack Banner */
$('.banner-meal-pack--description-btn').click(function(){
  if($(this).hasClass('show-more')){
    $('.description-second').addClass('hide');
    $('.description-dots').removeClass('hide');
    $(this).removeClass('show-more');
  }else{
    $('.description-second').removeClass('hide');
    $('.description-dots').addClass('hide');
    $(this).addClass('show-more');
  }
})

/*Location tabs*/
$('.locations').on('click', 'a[role="tab"]', function () {
  $("a[role='tab']").attr("aria-selected","false");
  $(this).attr("aria-selected","true");

  openTabpanel($(this));
});

function openTabpanel(element) {
  let tabpanelid= element.attr("aria-controls"),
      tabpanel = $("#"+tabpanelid);

  $("div[role='tabpanel']").attr("aria-hidden","true").hide();
  tabpanel.attr("aria-hidden","false").show();
}

// NDIS page //
const ndisForm = document.querySelector('.ndis__contact-form')
const ndisFormBtn = document.querySelector('.ndis__btn')
const ndisContactFormName = document.querySelector('#ContactFormName')
const ndisContactFormEmail = document.querySelector('#ContactFormEmail')
const ndisContactFormPhone = document.querySelector('#ContactFormPhone')
const ndisContactFormSubject = document.querySelector('#ContactFormSubject')
const ndisContactFormMessage = document.querySelector('#ContactFormMessage')
let ndisFormInputItems = document.querySelectorAll('.ndis-form__item')

function stopSubmitForm(formContainer) {
formContainer.onsubmit = (e) => {e.preventDefault()}
}
function startSubmitForm(formContainer) {
formContainer.submit()
}

// email validate
function validateEmail(inputEmail) {
  let emailValue = inputEmail.value
  if (validateEmailRegEx(emailValue) != true ) {
    inputEmail.classList.add('ndis-input--required')
    NdisCheckValidateErrors.push(false)
  }
  else if (validateEmailRegEx(emailValue) == true ) {
    inputEmail.classList.add('ndis-input--check')
    NdisCheckValidateErrors.push(true)
  }

}
function validateEmailRegEx(email) {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

// tel validate
function validateTel(inputTel) {
  let telValue = inputTel.value
  if (validateTelRegEx(telValue) != true || telValue.length < 6 ) {
    inputTel.classList.add('ndis-input--required')
    NdisCheckValidateErrors.push(false)
    document.querySelector(".ndis-input-tel--required").style.display = 'flex'
  }
  else if (validateTelRegEx(telValue) == true && inputTel.value.length >= 6) {
    inputTel.classList.add('ndis-input--check')
    NdisCheckValidateErrors.push(true)
    document.querySelector(".ndis-input-tel--required").style.display = 'none'
  }
}
function validateTelRegEx(tel) {
  const re = /^[0-9\-\+]{9,15}$/;
  return re.test(tel);
}

// text validate
function ndisTextValidate(inputItem, textLength) {
  if (inputItem.value.length < textLength) {
    inputItem.classList.add('ndis-input--required')
    NdisCheckValidateErrors.push(false)
  }
  else if (inputItem.value.length >= textLength) {
    inputItem.classList.add('ndis-input--check')
    NdisCheckValidateErrors.push(true)
  }
}
function checkAllItemRegEx(RegEx, array) {
  array.forEach(item => {
    if (RegEx.test(item) === false) {
      let indexItem = array.indexOf(item)
      array.splice(indexItem, 1)
    }
  })
}

// all ndisInputValidate
function allNdisValidate() {
  ndisFormInputItems.forEach(item => {
    item.classList.remove('ndis-input--required');
    item.classList.remove('ndis-input--check')
    item.classList.remove('ndis-input--submitted')
  })
  let title = document.querySelectorAll(".ndis-form-item__title")
  title.forEach(item => {
    item.classList.remove('ndis-form-item__title--submitted')
  })
  validateEmail(ndisContactFormEmail)
  validateTel(ndisContactFormPhone)
  ndisTextValidate(ndisContactFormName, 2)
  ndisTextValidate(ndisContactFormSubject, 3)
  ndisTextValidate(ndisContactFormMessage, 15)
}

let NdisCheckValidateErrors = []

ndisFormBtn.addEventListener('click', (e) => {
  stopSubmitForm(ndisForm)
  NdisCheckValidateErrors = []
  allNdisValidate()


  if (NdisCheckValidateErrors.every(elem => elem == true)) {
    startSubmitForm(ndisForm)
  }

})
ndisContactFormPhone.addEventListener('input', () => {
  let valueTel = ndisContactFormPhone.value

  if (/^[0-9\+]{1,15}$/.test(valueTel) == false) {
    let checkArray = valueTel.split('')
    checkAllItemRegEx(/^[0-9\+]{1,15}$/, checkArray)
    ndisContactFormPhone.value = checkArray.join('')
    document.querySelector(".ndis-input-tel--required").style.display = 'flex'
  }
})






