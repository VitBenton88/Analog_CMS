"use strict";var $loader=$(".loader-dual-ring"),$token=$("#token");$("#mfa_gen").click(function(){var s,a;$(this).hide(),$loader.show(),$.ajax({type:"GET",url:"/getusermfa",success:function(e){s=e.message,a=!0,$(".qr").append(e.qr),$(".qr-instructions").show(),$(".google_auth_notice").remove()},error:function(e){s=e.responseJSON.message,a=!1}}).always(function(){$loader.hide(),s&&$(".mfa-notifications").append('<div class="alert alert-'.concat(a?"success":"warning",' alert-dismissible fade show" role="alert">\n                <strong>').concat(a?"Success:":"Error:"," </strong> ").concat(s,'\n                <button type="button" class="close" data-dismiss="alert" aria-label="Close">\n                <span aria-hidden="true">&times;</span>\n                </button>\n                </div>'))})}),$("#mfa_confirm").click(function(){$loader.show();var s,a,n,e=$token.val();if(!e)return $token.addClass("is-invalid"),!1;$token.removeClass("is-invalid"),$.ajax({type:"POST",url:"/confirmusermfa",data:{token:e},success:function(e){s=e.message,n=e.recovery,a=!0,$(".qr, .qr-instructions").remove()},error:function(e){s=e.responseJSON.message,a=!1}}).always(function(){$loader.hide(),$(".mfa-notifications").empty(),s&&$(".mfa-notifications").append('<div class="alert alert-'.concat(a?"success":"warning",' alert-dismissible fade show" role="alert">\n                <strong>').concat(a?"Success:":"Error:"," </strong> ").concat(s,'\n                <button type="button" class="close" data-dismiss="alert" aria-label="Close">\n                <span aria-hidden="true">&times;</span>\n                </button>\n                </div>')),n&&($("#recovery").val(n).attr("readonly",!0),$(".recovery-instructions").show())})});