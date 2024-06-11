function addToCart(proId, event){
  event.preventDefault(); // Prevent default behavior of anchor tag
  $.ajax({
      url: '/add-to-cart/' + proId,
      method: 'get',
      success: (response) => {
          if (response.status) {
              // Update cart count in the navbar
              $.get('/cart-count', function (data) {
                  $('#cart-count').html('Cart <span class="badge bg-success">' + data + '</span>');
              });
          }
      }
  });
}

