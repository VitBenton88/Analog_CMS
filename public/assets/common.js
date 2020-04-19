/**
 * FUNCTIONS
 **/

const sendFile = (file, editor, welEditable) => {
    let data = new FormData();
    data.append("file", file);

    $.ajax({
        data: data,
        type: "POST",
        url: "/editorimageuploads",
        cache: false,
        contentType: false,
        processData: false,
        success: (result) => {
            const {
                fileName,
                filePath
            } = result;
            $('.summernote-editor').summernote('insertImage', filePath, fileName);
        }
    });
}

const menuPositionUpdate = (itemType) => {
    const menuPosAlertEle = $('.alert.menu-pos-alert');
    if (menuPosAlertEle) {
        menuPosAlertEle.fadeOut();
    }

    $('.page-body')
        .before(
            `<div class="alert alert-success alert-dismissible fade show menu-pos-alert" role="alert">
        <strong>Success: </strong> ${itemType} position update.
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
        </button>
        </div>`
        );
}

/**
 * INIT
 **/

// initialize Summernote editors
$(() => {
    $('.summernote-editor').summernote({
        minHeight: 500,
        callbacks: {
            onImageUpload: (files, editor, welEditable) => {
                sendFile(files[0], editor, welEditable);
            }
        }
    });
});

//initialize jQuery date pickers
$(".datepicker").datepicker();

/**
 * KEYUP
 **/

 // handle media search in media select modal
 $( "#media-select-search" ).keyup(function() {
    const search = $(this).val();

    // wait for atleast three characters
    if (search.length < 4) {
        return false;
    }

    // fire ajax to get search results
    $.ajax({
        type: "GET",
        url: `/api/media/search/${search}`,
        success: (media) => {
                // empty media items on modal
                $('.analog-modal.media-select .media-grid').empty();

                if (media.length) {
                // fill modal with results
                media.forEach((item, i) => {
                    $('.media-grid')
                    .append(
                        `<div id="media-${i}" data-id="${item._id}" data-path="${item.path}" class="col-4 col-md-3 col-lg-2 media-grid-item"
                        style="background-image: url('${item.path}')"></div>`
                    );
                });
                // show modal
                return $('.analog-modal').addClass('active');
            }
            // append no results message if so
            $('.media-grid').append(`<div class="col-12"><h4>No media found.</h4></div>`);

        },
        error: (error) => {
            $('.custom-fields-notifications .alert').remove();
            $('.custom-fields-notifications')
                .append(
                    `<div class="alert alert-warning alert-dismissible fade show" role="alert">
            <strong>Error: </strong> ${error.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
                );
        }
    });

  });

/**
 * HOVER
 **/

// expand submenus in CMS main navigation
$('.cms-menu .nav-item.nav-has-submenu').hover(function () {
    const $this = $(this);

    if ($this.hasClass('current')) {
        return false;
    }

    return $this.addClass('expanded');

}, function () {
    const $this = $(this);

    if ($this.hasClass('current')) {
        return false;
    }

    return $this.removeClass('expanded');
})

/**
 * CLICK
 **/

 // handle media selection in media select modal ::GLOBAL
 $('body').on('mouseup', '.analog-modal.media-select.active button.select', () => {
     const $selectedMedia = $('.analog-modal.media-select.active .media-grid-item.selected');

     // if no media is selected, abort
    if (!$selectedMedia.length) {
        return false;
    }
    // capture media details
    const _id = $selectedMedia.data('id');
    const path = $selectedMedia.data('path');

    // update thumbnail
    $('.image-upload-thumb').removeClass('no-image').addClass('image-exists').css('background-image', `url('${path}')`).empty();

    // insert captured id as value into form field
    $('input#_image').val(_id)

    // empty media items on modal
    $('.analog-modal .media-grid').empty();
});

 // handle media select modal dismissal ::GLOBAL
 $('body').on('mouseup', '.analog-modal.media-select.active button.dismiss', () => {
    // empty media items on modal
    $('.analog-modal .media-grid').empty();
});

 // handle media selection in select modal ::GLOBAL
 $('body').on('click', '.analog-modal.media-select.active .media-grid-item', function () {
     const $this = $(this);

    if ($this.hasClass('selected')) {
        $this.removeClass('selected')
        return false;
    }

    // remove any other selected class to avoid dups
    $('.media-grid-item').removeClass('selected')
    $this.addClass('selected')
    return false;
});

 // handle media select modal ::GLOBAL
 $('.image-upload-thumb').click(() => {
    $.ajax({
        type: "GET",
        url: '/api/media/',
        success: (media) => {
            // empty media items on modal
            $('.analog-modal.media-select .media-grid').empty();
            if (media.length) {
                media.forEach((item, i) => {
                    $('.media-grid')
                    .append(
                        `<div id="media-${i}" data-id="${item._id}" data-path="${item.path}" title="${item.fileName}" class="col-4 col-md-3 col-lg-2 media-grid-item"
                        style="background-image: url('${item.path}')"></div>`
                    );
                });
                // show modal
                return $('.analog-modal').addClass('active');
            }
            // append no results message if so
            $('.analog-modal').addClass('active');
            $('.media-grid').append(`<div class="col-12"><h4>No media found.</h4></div>`);
        },
        error: (error) => {
            $('.custom-fields-notifications .alert').remove();
            $('.custom-fields-notifications')
                .append(
                    `<div class="alert alert-warning alert-dismissible fade show" role="alert">
            <strong>Error: </strong> ${error.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
                );
        }
    });
})

// handle global modal closing
$('.analog-modal .modal-footer button').click(function () {
    const $modal = $('.analog-modal');

    // if the user is saving changes, submit form
    if ($(this).hasClass('update')) {
        $('#updatemedia').submit();
    }

    $modal.removeClass('active')
})

// handle content image removals
$('#image-upload-thumb-rm').click(function () {
    const $this = $(this);
    const _id = $this.data('id');
    const url = $this.data('delajaxurl');

    // avoid firing ajax without values
    if (!_id || !url) {
        return false;
    }

    $.ajax({
        type: "POST",
        url: url,
        data: {
            _id
        },
        success: function (result) {
            $this.remove();
            $('input#_image').val('')
            $('.image-upload-thumb.image-exists').css('background-image', 'none').addClass('no-image');
            $('.image-upload-thumb.image-exists i').removeClass('d-none');
            $('.custom-fields-notifications')
                .append(
                    `<div class="alert alert-success alert-dismissible fade show" role="alert">
            <strong>Success: </strong> ${result.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
                );
        },
        error: function (error) {
            $('.custom-fields-notifications')
                .append(
                    `<div class="alert alert-warning alert-dismissible fade show" role="alert">
            <strong>Error: </strong> ${error.responseJSON.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
                );
        }
    }).always(function () {
        $('.custom-fields-notifications .alert').remove();
    });

})

// handle next and previous pagination link clicks
$('.page-link.directional').click(function () {
    event.preventDefault();
    const $currentPage = $('.page-item.active');
    const $nextPage = $currentPage.next();
    const $prevPage = $currentPage.prev();

    if ($(this).hasClass('next')) {
        $nextPage.find('a.page-link')[0].click();
        return false;
    }

    $prevPage.find('a.page-link')[0].click();
})

// reveal custom field update options
$('body').on('click', '.editcustomfield', function () {
    const $this = $(this);
    const customField = $this.data('cf');
    const updateCustomFieldBtn = $(customField).find('.updatecustomfield');
    const customFieldInputs = $(customField).find('input');
    const $deleteBtn = $(customField).find('button.btn-danger');

    customFieldInputs.prop("disabled", false); // input fields are now enabled.
    updateCustomFieldBtn.show();
    $this.hide();
    $deleteBtn.hide();
})

// handle custom field deletions
$('body').on('click', '.deletecustomfield', function () {
    const $this = $(this);
    const _id = $this.data('id');
    const row_id = $this.data('row');

    $('.custom-fields-notifications .alert').remove();

    $.ajax({
        type: "POST",
        url: "/deletecustomfield",
        data: {
            _id
        },
        success: function (result) {
            $('.custom-fields-notifications')
                .append(
                    `<div class="alert alert-success alert-dismissible fade show" role="alert">
            <strong>Success: </strong> ${result.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
                );
            $(row_id).remove();
        },
        error: function (error) {
            $('.custom-fields-notifications')
                .append(
                    `<div class="alert alert-warning alert-dismissible fade show" role="alert">
            <strong>Error: </strong> ${error.responseJSON.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
                );
        }
    });

})

// handle custom field updates
$('body').on('click', '.updatecustomfield', function () {
    const customField = $(this).data('cf');
    const $slugInput = $(customField).find('input[name=slug]');
    const $valueInput = $(customField).find('input[name=value]');
    const $delBtn = $(customField).find('button.btn-danger');
    const $editBtn = $(customField).find('button.editcustomfield');
    const $updateBtn = $(customField).find('button.updatecustomfield');
    const slug = $slugInput.val().trim();
    const value = $valueInput.val().trim();
    const _id = $(customField).find('input[name=cf_id]').val();

    if (!slug) {
        $('#new-custom-field').addClass('was-validated');
        return false;
    }

    $('.custom-fields-notifications .alert').remove();

    $.ajax({
        type: "POST",
        url: "/updatecustomfield",
        data: {
            _id,
            slug,
            value
        },
        success: function (result) {
            $slugInput.prop('disabled', true);
            $valueInput.prop('disabled', true);
            $('.custom-fields-notifications')
                .append(
                    `<div class="alert alert-success alert-dismissible fade show" role="alert">
            <strong>Success: </strong> ${result.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
                );
        },
        error: function (error) {
            $('.custom-fields-notifications')
                .append(
                    `<div class="alert alert-warning alert-dismissible fade show" role="alert">
            <strong>Error: </strong> ${error.responseJSON.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
                );
        }
    }).always(function () {
        $updateBtn.hide();
        $delBtn.show();
        $editBtn.show();
    });

})

// handle custom field additions
$('#addcustomfield').click(function () {
    const $slugInput = $('#new-custom-field-slug');
    const $valueInput = $('#new-custom-field-value');
    const slug = $slugInput.val().trim();
    const value = $valueInput.val().trim();
    const ownerModel = $('#new-custom-field-ownerModel').val();
    const owner = $('#new-custom-field-owner').val();

    if (!slug) {
        $slugInput.addClass('is-invalid');
        return false;
    }

    $('.custom-fields-notifications .alert').remove();

    $.ajax({
        type: "POST",
        url: "/addcustomfield",
        data: {
            slug,
            value,
            ownerModel,
            owner
        },
        success: function (result) {
            $('.custom-fields-notifications')
                .append(
                    `<div class="alert alert-success alert-dismissible fade show" role="alert">
            <strong>Success: </strong> ${result.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
                );
            // append new custom field row
            $('#custom-fields-list')
                .append(
                    `
                    <div id="cf-${result.created._id}" class="row custom-field">
                    <div class="col-6 col-md-4">
                        <input id="new-custom-field-slug" name="slug" type="text" class="form-control"
                            placeholder="Enter slug ..." value="${result.created.slug}" required disabled></input>
                        <div class="invalid-feedback">Required.</div>
                    </div>
                    <div class="col-6 col-md-4">
                        <input id="new-custom-field-value" name="value" type="text" class="form-control"
                            placeholder="Enter value ..." value="${result.created.value}" disabled></input>
                    </div>
                    <div class="col-4">
                        <input id="new-custom-field-id" type="hidden" name="cf_id" value="${result.created._id}">
                        <button type="button" class="btn btn-success editcustomfield" data-cf="#cf-${result.created._id}"><i class="far fa-edit"></i></button>
                        <button type="button" class="btn btn-info updatecustomfield" data-cf="#cf-${result.created._id}">Update</button>
                        <button type="button" class="btn btn-danger deletecustomfield" data-row="#cf-${result.created._id}" data-id="${result.created._id}"><i class="far fa-trash-alt"></i></button>
                    </div>
                </div>`
                )

            // remove 'no custom fields' alert
            $('.no-cf-alert').remove();

            // clear inputs
            $slugInput.val('').removeClass('is-invalid');
            $valueInput.val('');
        },
        error: function (error) {
            $('.custom-fields-notifications')
                .append(
                    `<div class="alert alert-warning alert-dismissible fade show" role="alert">
            <strong>Error: </strong> ${error.responseJSON.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
            </div>`
                );
        }
    });

})

// toggle expand/collapse icons
$('.section-head').click(function () {
    const closestWrap = $(this).find('.section-toggle-controls');

    if (closestWrap.hasClass('expanded')) {
        closestWrap.removeClass('expanded');
    } else {
        closestWrap.addClass('expanded');
    }
})

// toggle add overlays
$('.add-item-overlay, .add-project-overlay').click(function () {
    if ($(this).hasClass('active')) {
        $(this).removeClass('active');
    } else {
        $(this).addClass('active');
    }

    return false;
})

// toggle mobile menu
$('.mobile-menu-toggle').click(() => {
    if ($('body').hasClass('mobile-menu-active')) {
        $('body').removeClass('mobile-menu-active');
    } else {
        $('body').addClass('mobile-menu-active');
    }

    return false;
})

// TABLE CHECKBOXES
// select all list item checkboxes when select "all" checkbox is selected
$('.listCheckbox.selectAll').click(function () {
    if ($('.listCheckbox.selectAll:checked').length) {
        return $('#list .listCheckbox.selectSingle:enabled').prop("checked", true);
    }

    $('.multi-edit-select-hidden').hide();
    $('#list .listCheckbox.selectSingle:checked').prop("checked", false);
})

// enable/disable multi edit dropdown when list checkbox is selected
$('.listCheckbox').click(function () {
    if ($('#list .listCheckbox.selectSingle:checked').length) {
        return $('#multi-edit-select, #submit_list_multi_edit').prop("disabled", false);
    }

    $('.multi-edit-select-hidden').hide();
    $('#multi-edit-select, #submit_list_multi_edit').prop("disabled", true);
})

// handle table multi-select
$('#submit_list_multi_edit').click(function () {
    const $this = $(this);
    const list_id_arr = [];
    const url = $this.data('url');
    const $update_criteria_option = $('#multi-edit-select option:selected');
    const $update_select = $($update_criteria_option.data('target'));
    const update_criteria = $update_criteria_option.val();
    const update_value = $update_select.val();

    // disable submit button
    $this.prop("disabled", true);

    $('#list .listCheckbox.selectSingle:checked').each(function (i, obj) {
        list_id_arr.push($(obj).val());
    });

    $.ajax({
        type: "POST",
        url,
        data: {
            list_id_arr,
            update_criteria,
            update_value
        },
        success: function () {
            location.reload();
        }
    });
})

// Provide strong password
$('#get_strong_pass').click(function () {
    const $password_inputs = $('.password_target, .verify_password_target, .password_helper input');
    $password_inputs.val('');
    
    $.ajax({
        type: "GET",
        url: "/api/password",
        success: function (strong_password) {
            $password_inputs.val(strong_password);
            $('.password_helper').show();
        },
        error: function(error) { 
            console.error(error);
            alert("An error occurred while retrieving a strong password. Please try again later.");
        }  
    });
})

/**
 * CHANGE
 **/

// show options for update values dynamically
// cover update values for pages, posts, and redirects pages.
$('#multi-edit-select').change(function () {
    const $selection_target = $( $(this).find(":selected").data('target') );
    // hide others
    $('.multi-edit-select-hidden').hide();
    // reveal current value selector
    $selection_target.show();
});

// capture page limit and refresh
$('#paginationlimit').change(function () {
    const limit = $(this).val();
    let currentUrl = window.location.href;
    const limitExists = currentUrl.indexOf('limit=') >= 0;

    if (limitExists) {
        currentUrl = currentUrl.substring(0, currentUrl.indexOf('limit=') + 'limit='.length);
        location.href = `${currentUrl}${limit}`;
        return false;
    }

    const queryToAdd = currentUrl.indexOf('&') !== -1 ? '&limit=' : '?limit=';
    location.href = `${currentUrl}${queryToAdd}${limit}`;
});

// Remove strong password helper text when password is manually changed
$('.password_target, .verify_password_target').on('input', function () {
    $('.password_helper').hide();
})