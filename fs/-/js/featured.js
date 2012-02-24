// HOMEPAGE SLIDESHOW
$('#slides').cycle({ 
    fx:     'fade', 
    speed:  500, 
    timeout: 4000, 
    pause: true,
    pager:  '#featured #nav ul', 
    pagerAnchorBuilder: function(idx,slide) { 
    // return selector string for existing anchor 
    return '#featured #nav li:eq(' + idx + ') a'; 
    } 
});