"use strict";$("#mfa_gen").click(function(){var a,s;$(this).hide(),$(".loader").append('<div class="loader-dual-ring"></div>'),$.ajax({type:"POST",url:"/createusermfa",success:function(e){a=e.message,s=!0,$(".qr").append(e.qr),$(".google_auth_notice").remove()},error:function(e){a=e.responseJSON.message,s=!1}}).always(function(){$(".loader-dual-ring").remove(),$(".mfa-notifications").append('<div class="alert alert-'.concat(s?"success":"warning",' alert-dismissible fade show" role="alert">\n            <strong>').concat(s?"Success:":"Error:"," </strong> ").concat(a,'\n            <button type="button" class="close" data-dismiss="alert" aria-label="Close">\n            <span aria-hidden="true">&times;</span>\n            </button>\n            </div>'))})});