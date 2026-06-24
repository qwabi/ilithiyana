$(document).ready(function () {
    jQuery(".footer-wrapper h3").click(function () {
        jQuery(this).parent(".quick-nav").toggleClass("open");
        jQuery('html, body').animate({ scrollTop: jQuery(this).offset().top - 170 }, 1500);
    });

    $('#bannerCarousel').owlCarousel({
        loop: true,
        nav: false,
        autoplay: true,
        smartSpeed: 2000,
        autoplayTimeout: 6000,
        autoplayHoverPause: true,
        responsive: {
            0: {
                items: 1
            }
        },
        onTranslated: function (me) {
            $(me.target).find(".owl-item.active > .item").each(function (i, v) {
                if ($(window).width() < 992) {
                    $("header .landing-section .hero-section").fadeTo('slow', 1, function () {
                        $(this).css({
                            'background': 'url(' + $(v).attr("data-src") + ') top center',
                            'background-repeat': 'no-repeat',
                            'background-size': 'auto 430px'
                        });
                    }).fadeTo('slow', 1);
                }
                else {
                    $("header .landing-section .hero-section").fadeTo('slow', 1, function () {
                        $(this).css({
                            'background': 'url(' + $(v).attr("data-src") + ') top center',
                            'background-repeat': 'no-repeat'
                        });
                    }).fadeTo('slow', 1);
                }
            });
        }
    });

    $('#homeCatogories').owlCarousel({
        loop: true,
        margin: 30,
        nav: true,
        autoplay: true,
        smartSpeed: 1000,
        autoplayTimeout: 3500,
        autoplayHoverPause: true,
        responsive: {
            0: {
                items: 1
            },
            991: {
                items: 3
            },
            1200: {
                items: 6
            }
        }
    });

    $('.panel-collapse').on('show.bs.collapse', function () {
        $(this).siblings('.panel-heading').addClass('active');
    });

    $('.panel-collapse').on('hide.bs.collapse', function () {
        $(this).siblings('.panel-heading').removeClass('active');
    });


    /*Stops the Sub Dropdown from closing the main dropdown when you click on the Sub Dropdown*/
    var parentElement = $(".dropdownSubMenu").parent().closest(".ParentDropDownSub");

    $.fn.hasAttr = function (name) {
        return this.attr(name) !== undefined;
    };

    $(".ParentDropDownSub-toggle").on("click", function () {
        if ($(window).width() < 992) {
            if (!parentElement.hasAttr("dropdown-toggle")) {
                parentElement.children().closest(".dropdown-toggle").attr("data-toggle", "dropdown");
            }
        }
        else {
            $(this).css('background', 'transparent');
        }
    });
    $(".dropdownSubMenu").on("click", function () {
        if ($(window).width() < 992) {
            parentElement.children().closest(".dropdown-toggle").removeAttr("data-toggle");
        }
    });

    // Sticky Nav on Scroll
    $(window).scroll(function () {
        // Desktop only
        if ($(window).width() > 992) {
            if ($(this).scrollTop() > 450) {
                $('#top-menu-sticky').css('display', 'block');
            } else {
                $('#top-menu-sticky').css('display', 'none');
            }
        }
    });

    // Dynamic Colors
    // ----------------------
    //#FDCC1C - Yellow
    //#2A942D - Green
    //#0980CB - Blue
    //#A31110 - Red
    // ----------------------

    var color = getDynamicColor();

    function getDynamicColor() {
        var colors = ['#FDCC1C', '#2A942D', '#0980CB', '#A31110'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Set Button colors
    $('.dynamic-color').each(function () {
        var element = $(this);
        element.css('color', color);
    });

    // Set hr colors
    $('hr.dynamic-color').each(function () {
        var element = $(this);
        element.css('border-bottom', `9px solid ${color}`);
    });

    // Set border colors
    if ($(window).width() < 992) {
        $('.dynamic-color-border').each(function () {
            var element = $(this);
            element.css('border-bottom', `9px solid ${color}`);
        });
    }
    else {
        $('.dynamic-color-border').each(function () {
            var element = $(this);
            element.css('border-right', `9px solid ${color}`);
        });
    }
    $('.vl-left').each(function () {
        var element = $(this);
        element.css('border-left', `9px solid ${color}`);
    });
    $('.vl-right').each(function () {
        var element = $(this);
        element.css('border-right', `9px solid ${color}`);
    });

    // Set Footer Border Color
    $('#footerDiv').css('border-top', `8px solid ${color}`);

    // Set Faculties Colors
    var facultyColors = ['#FDCC1C', '#2A942D', '#0980CB', '#A31110'];
    var facultyCounter = 0;
    $('hr.article-color ').each(function () {
        var element = $(this);
        var selectedColor = facultyColors[facultyCounter];
        element.css('border-bottom', `9px solid ${selectedColor}`);
        facultyCounter++;
    });
});
