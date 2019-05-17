import { Directive, OnChanges, Input, SimpleChanges, OnInit, OnDestroy, Output, EventEmitter, Optional, HostListener } from "@angular/core";
import { FormGroup, AbstractControl, NgControl, ControlContainer, FormGroupDirective, FormGroupName, FormArrayName, FormArray } from "@angular/forms";
import { VALIDATION_MESSAGE_KEY } from ".";

interface FormBindAware {
    updateForm(form : AbstractControl) 
}

export interface ErrorModel {
    key : string
    msg : string
}

/**
 * This is used to bind the form instance and inform ferror or other directives on form binding change so that they
 * can react accordingly. This is developed to support reset of form.
 * 
 * Using formGroup.reset(oldData) is not desirable because if there are new control added, reseting will not remove the newly
 * added control. Hence, the strategy for resetting is recreate the whole form. However, directive such as [ferror] is not aware
 * of the new form instance and continue to monitor old form instance.
 * 
 */
@Directive({
    selector: "[fcoord]"
})
export class FormCoordinator implements OnChanges {

    @Input("fcoord")
    form : FormGroup

    directives : FormBindAware[] = []

    ngOnChanges(change : SimpleChanges) {
        if (change["form"]) {
            this.directives.forEach(d => d.updateForm(this.form))
        }
    }

    addDirective(bindAware : FormBindAware) {
        this.directives.push(bindAware)
    }

    removeDirective(bindAware : FormBindAware) {
        var i = 0
        for (; i < this.directives.length; i++)
            if (this.directives[i] === bindAware) break
        
        this.directives.splice(i,1)
    }

}

/**
 * A directive to set error for a form control / container. It is designed to work
 * with FormControl, FormGroup, and FormArray. The form has to be created using FormCreator below.
 * 
 * The form error directive obtains the control/container instance it needs to monitor for 
 * errors through dependency injection.
 */
@Directive({
    selector: "[ferror]"
})
export class FormError implements OnInit, FormBindAware, OnDestroy {

    // out that emit the error whenever it can detects one
    @Output('ferrorChange') udpate : EventEmitter<ErrorModel> = new EventEmitter<ErrorModel>()
    @Input('ferror') currentErrorMessage : ErrorModel

    control : AbstractControl
    // note that this is set when the control OWN VALIDATORS return valid. It doesn't coincide the validity of the control
    // for example, if the control is a FormGroup and one of its internal control is not valid, the FormGroup validity is FALSE
    // but if the FormGroup validator return VALID then this value is TRUE.
    isLastValid : boolean = false

    constructor(
        @Optional() private ngControl : NgControl, 
        @Optional() private group : ControlContainer,
        @Optional() private coordinator : FormCoordinator) {}

    ngOnInit() {
        
        if (this.ngControl) {
            this.control = this.ngControl.control
            this.control.statusChanges.subscribe(this.tryUpdateError.bind(this, this.control, false))
        } else if (this.group) {
            if (this.group instanceof FormGroupDirective) this.control = this.group.form
            else if (this.group instanceof FormGroupName || this.group instanceof FormArrayName) this.control = this.group.control

            this.control.valueChanges.subscribe(this.tryUpdateError.bind(this, this.control, false))
        }

        if (this.coordinator) this.coordinator.addDirective(this as FormBindAware)
    }

    @HostListener('blur')
    checkBlur() {
        if (this.control && this.control.pristine) {
            this.tryUpdateError(this.control)
        }
    }

    tryUpdateError(control : AbstractControl) {

        if (control.invalid) {
            if (control.errors) {
                this.extractAndEmitFirstError(control.errors, control[VALIDATION_MESSAGE_KEY])
            }

            if (control instanceof FormGroup || control instanceof FormArray) {
                // the group's own validators might be returning valid, but one of the internal control of the group
                // is not valid, resulting in the overall invalidity of the group.
                // In this case, we want to clear the errors created by the group's own validators.
                if (!control.errors && !this.isLastValid) {
                    this.isLastValid = true
                    this.udpate.emit(null)

                    return
                }
            }
        } else if (control.valid && !this.isLastValid) {
            this.udpate.emit(null)    // clear error if this time is valid and last time was not valid
        }

        this.isLastValid = control.valid

    }


    /**
     * TODO: Define the structure of messages / errors and allow custom interpretation of the error message. This is because sometimes validator method 
     * might produce error object with more than just a format of { '<code>' : '<message string>' }. One possible way is the user can attach an
     * interpreter in the messages object for example:
     * 
     * Errors can be: { '<code>' : <some complicated error object> } --> produced by validation function
     * Messages can be  { '<code> : <some interpreter which understand the error object> } --> this is attached to the control and the intepreter will be used 
     * to produce the error messages from the error object.
     * 
     * @param errors the errors of a control or control container
     * @param messages the messages map which contains the validation messages
     */
    extractAndEmitFirstError(errors : any, messages : any) {
        for (var key in errors) {
            if (messages && messages[key])
                this.udpate.emit({ key : key, msg: messages[key] })
            else if (errors[key]) 
                this.udpate.emit({key : key, msg: errors[key]})
            else this.udpate.emit({ key : key, msg : key })

            return
        }
    }

    updateForm(form : AbstractControl) {
        var path = []
        
        if (this.ngControl) path = this.ngControl.path
        else if (this.group) path = this.group.path

        var c = form.get(path)

        if (c) {
            this.control = c

            if (this.ngControl) {    
                this.control.statusChanges.subscribe(this.tryUpdateError.bind(this, this.control, false))
            } else if (this.group) {
                this.control.valueChanges.subscribe(this.tryUpdateError.bind(this, this.control, false))
            }
        }
    }

    ngOnDestroy() {
        if (this.coordinator) this.coordinator.removeDirective(this)
    }

}