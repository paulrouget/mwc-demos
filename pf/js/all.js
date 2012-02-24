
// Hide the stat-box
function hide_stats(){
	var user_id = $(this).attr('href');
	$('#stat_box').fadeOut(300);
	$.post("/ajaxall/hidestatbox", { userId: user_id });
	return false;
}



// hide a poet from the feeds
function hide_writer(){
	var id = $(this).attr('data-id');
//	$.post("/write/removereader", { id: id } ); // do the post
	$('.feed_item_' + id).css({ 'backgroundColor':'#eee' }).fadeOut(200, function() { $('.feed_item_' + id).remove(); }); // fade and remove the poet
	return false;	
}

$(document).ready(function() {

	/mobile/i.test(navigator.userAgent) && !location.hash && setTimeout(function () {
		  if (!pageYOffset) window.scrollTo(0, 1);
		}, 1000);
	
	$('#searchform').click(function() {
	    if ($(this).val() == 'Search') {   
	        $(this).data('original', $(this).val()).val('');
	        }
	});

	$('#searchform').blur(function() {
	    if ($(this).val() == '') {   
	        $(this).val($(this).data('original'));
	        }
	});
	
	$(".feed").hover(
			function () {
				var id = $(this).attr('data-id');
				$('#hide_id_' + id).addClass('hover');
			},
			function () {
				var id = $(this).attr('data-id');
				$('#hide_id_' + id).removeClass('hover');
			}
		);

	$(".have_submenu").hover(
		function () {
			$(this).addClass('hover');
		}, 
		function () {
			$(this).removeClass('hover');
		}
	);
	
	$('#toggle_sign_in').click(function(){
		$('.login_box').slideToggle(50,function focusLogin(){
			$('#user_name').focus();
		});
		return false;
	});
	
	$('#hide_stats').click(hide_stats); // hide the stats i header
	$('.hide_writer').click(hide_writer); // hide a poet in the feed
});