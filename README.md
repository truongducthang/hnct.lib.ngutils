# Form Utils
## Form Creator

Form Creator allows fast creation of form object from javascript object.

```typescript

var data = {
    name : "John Doe",
    phone : "8777484",
    addresses : [
        { id : "addr01", state: "New York", city: "New York"  },
        { id : "addr02", state: "New York", city: "Boston" }
    ]
}

// fb is an injected angular form builder
var form : FormGroup = new FormCreator(fb, data).build()

```

The `form` created will have structure similar to above data structure.

### Validation

You can add validation that resemble the data structure

```typescript
var validation : ValDef = {
    name : [Validators.required, Validators.minLength(5)],
    phone : [Validators.required, Validators.pattern(/[6|8|9]\d{7}|\+65[6|8|9]\d{7}|\+65\s[6|8|9]\d{7}/)],
    addresses : []
}

// since addresses is an array, you have to add validation for each individual address
for (var i = 0; i < data.addresses.length; i++) 
    validation.addresses.push({
        id : [Validators.required]
        // if a field, e.g. city doesn't need validation, you can omit it.
    })

// fb is an injected angular form builder
var form : FormGroup = new FormCreator(fb, data).
                            validators(validation).
                            build()

```

In some cases, you might want to validate a whole form group or whole form array. For example, in the above example, you want to validate that:

- The person has at least 2 addresses
- For each address, the city must be a valid city of the state

```typescript

var validation : ValDef = {
    name : [Validators.required, Validators.minLength(5)],
    phone : [Validators.required, Validators.pattern(/[6|8|9]\d{7}|\+65[6|8|9]\d{7}|\+65\s[6|8|9]\d{7}/)],

    // important, the validation of the addresses array is now 
    // an object
    addresses : {}      
}

var addrVal = {}
addrVal[SELF_KEY] = [ minArrayLength(5) ]   // validation for the whole array

// For each address, we can use the same validation, so just create it once!
var singleAddrVal = {}
singleAddrVal[SELF_KEY] =  [ /*... some validators to validate the city is a valid city of the state... */ ]
singleAddrVal[FIELD_KEY] = {
    id : [Validators.required]
    // if a field, e.g. city & state, doesn't need validation, you can omit.
}

// the array of validator to validate individual element
addrVal[FIELD_KEY] = []
for (var i = 0; i < data.addresses.length; i++)
    addrVal[FIELD_KEY].push(singleAddrVal)

// fb is an injected angular form builder
var form : FormGroup = new FormCreator(fb, data).
                            validators(validation).
                            build()

```

If you want to have async validators

```typescript

// fb is an injected angular form builder
var form : FormGroup = new FormCreator(fb, data).
                            asyncValidators(asyncValidation).
                            build()

```

For the `minArrayLength` custom validation function, it needs to return an error of the specific format so that we can use it to retrieve the validation error messages later on.

```typescript

function minArrayLength(length : number) : ValidatorFn {
    return (arr : FormArray) => {
        if (arr.length < length) 
            return { minArrayLength : true }    // return an object saying that there is an error for minArrayLength

        return null // no error
    }
}

```

### Form error messages

There are simple directives to support displaying error messages easier. Let's say you have the above created `form` and want to add some validation messages and display it on the template.

```typescript

    // declare error model inside the component
    nameError : ErrorModel
    phoneError : ErrorModel
    addressArrayError : ErrorModel  // error of the WHOLE address array

    addressErrors : { [key : string] : ErrorModel } = {}    // a map, containing error for each individual address of the addresses array

```

```html
<!-- This example uses angular material + bootstrap for form display, you can use other library too -->
<div class="row" [formGroup]="form" [fcoord]="form"> <!-- fcoord directive is important if you might change the binding of form in future -->
    <div class="col-md-2">
        <mat-form-field class="w-100">	
            <input matInput placeholder="Name" formControlName="name" [(ferror)]="nameError" />
            <mat-error *ngIf="nameError">{{nameError.msg}}</mat-error>
        </mat-form-field>
    </div>
    <div class="col-md-2">
        <mat-form-field class="w-100">	
            <input matInput placeholder="Phone" formControlName="phone" [(ferror)]="phoneError" />
            <mat-error *ngIf="phoneError">{{phoneError.msg}}</mat-error>
        </mat-form-field>
    </div>

    <div class="col-md-6" formArrayName="addresses" [(ferror)]="addressArrayError">

        <!-- since we have validation for the whole addresses array, we want to display it here-->
        <mat-error *ngIf="addressArrayError">{{addressArrayError.msg}}</mat-error>

        <div class="row" *ngFor="let c of form.get('addresses').controls; let i=index" [formGroup]="c" [(ferror)]="addressErrors[i]"> 
            <div class="col-12">
                <h6>Address {{i}}</h6>
                <mat-error *ngIf="addressErrors[i]">{{addressErrors[i].msg}}</mat-error>
            </div>
            <div class="col-md-3">
                <mat-form-field class="w-100">	
                    <input matInput placeholder="Id" formControlName="id" [(ferror)]="idErrors[i]" />
                    <mat-error *ngIf="idErrors[i]">{{idErrors[i].msg}}</mat-error>
                </mat-form-field>
            </div>
            <div class="col-md-3">
                <mat-form-field class="w-100">	
                    <input matInput placeholder="State" formControlName="state" />
                </mat-form-field>
            </div>
            <div class="col-md-3">
                <mat-form-field class="w-100">	
                    <input matInput placeholder="City" formControlName="city" />
                </mat-form-field>
            </div>
        </div>
    </div>
</div>

```

Validation messages are attached to the form during form creation:

```typescript

var validationMsgs = {
    name : {
        required: "Name is required",
        minlength : "Minimum length of name is 5 characters"
    },
    phone : {
        required: "Phone number is required",
        pattern: "Invalid phone number pattern"
    },

    // important, the validation messages of the addresses array is an object
    addresses : {}      
}

var addrValMsgs = {}
addrValMsgs[SELF_KEY] = { minArrayLength : "You need at least 5 addresses" }    // the field name minArrayLength must match the field name of the error returned by validation function

// For each address, we can use the same validation, so just create it once!
var singleAddrValMsgs = {}
singleAddrValMsgs[SELF_KEY] =  { /* the validation messages for each individual address object as a whole */ }
singleAddrValMsgs[FIELD_KEY] = {
    id : {
        required: "Address id is required"
    }
    // other fields don't have any validation, so there is no validation messages for it too
}

// the array of validator messages for individual element
addrValMsgs[FIELD_KEY] = []
for (var i = 0; i < data.addresses.length; i++)
    addrValMsgs[FIELD_KEY].push(singleAddrValMsgs)

// Now you create the form with the validation and validation messages
var form : FormGroup = new FormCreator(fb, data).
                            validators(validation).
                            validatorMessages(validationMsgs).
                            build()

```

## Form Flow

In some situations, you might want to create a uri that contains your form data, and upon visiting that uri, the form is automatically filled. For example, you are implementing a search form, and it would be nice if you have a uri corresponding to the search criteria, which you can then copy and pass it to others.

The `fflow` structural directive support this use case. It generally works as following:

1. Check the activated route for any form data
2. If form data exists, it deserializes and use it to create the form through invoking a configured builder with the data
    1. It invoke the configured submit function once.
3. If form data doesn't exist, it invoke the configured builder with no data

The `fflow` works with `form-flow-submit` directive, which listen for click event on an element and invoke `fflow` navigation process.

1. `form-flow-submit` is clicked
2. `fflow` serializes the form using to JWT format
3. `fflow` invokes a configured navigation method with a navigation event
4. The configured navigation method should perform some custom logic and eventually, invoke the router to navigate to a route with the parameters containing the serialized search data
5. `fflow` upon detecting the new route activated, it will perform the above flow

### Example

The `fflow` and `form-flow-submit` can be used in your template as following:

```html

<div *fflow="let form by buildForm; fflow as f; nav : navigate; submit : search"  [formGroup]="form" [fcoord]="form" >

    <!-- display the form fields here -->

    <div>
        <button [disabled]="!f.canSubmit()" [form-flow-submit]="f">Submit</button>
        <button [disabled]="!f.dirty()" (click)="f.reset()">Reset</button>
    </div>

</div>

```

### FFlow API and configuration

Config | Microsyntax | Usage | Required | Type
-------|-------------| ----- | -------- | ----
$implicit | yes | Expose the form group for usage in the enclosed template. e.g `let form` | yes | FormGroup
fflowBy | yes | Configure the builder that build the form group from the data object | yes | (data : any) => FormGroup
fflow | yes | Expose the directive instance to be used in the enclosed template. e.g. `fflow as f` or `let f=fflow` | no | FormFlow
fflowNav | yes | Configure the navigation function, which will be invoked upon `form-flow-submit` is clicked | yes if `noNavigation` is `false` | (data : FormFlowNavigationData) => void
fflowSubmit | yes | Configure the submit function, which will be invoked upon detecting a navigation with form data on the uri | yes | (data : FormFlowSubmitEvent) => void
fflowIgnoreInit | yes | Whether or not to ignore the first navigation if there is no form data detected on the activated route. Sometimes you might want to set this to `false`, for example you want to do a default search with default parameters for search form | no, default to `true` | Boolean
noNavigation | no | Whether to do navigation on clicking `form-flow-submit` | no, default `false` | Boolean
paramKey | no | The name of the parameter used on the uri | no, default = searchData | string
jwtKey | no | The key used for JWT encoding | no, default = fflowkey | string

There are some methods

Method / Property | Usage
-------|-------------
canSubmit() | Check if this form can be submit. It is equivalent to checking if form exists, it is dirty and it is valid
dirty() | Check if this form is dirty
reset(data? : any) | Reset the form with an optional data. If no data is specified, the data used for created the form the first time will be used.
form | The property for getting the form created

### De-sugar syntax

In the above example, we use the sugarized syntax (microsyntax) to configure `fflow`. However, using this syntax, you are not able to extract the `fflow` instance to use outside of its own enclosed template, e.g. in the case you want to put the `form-flow-submit` button outside of the `fflow`'s template. In this scenario, you can use de-sugar syntax instead

```html

    <ng-template fflow let-form [fflowBy]="buildForm" [fflowNav]="navigate" [fflowSubmit]="search" ref-fi="fflow">
        <div [formGroup]='form' [fcoord]='form'>
        <!-- display the form fields here -->
        </div>
    </ng-template>

    <!-- The buttons are outside of the fflow's template but wants to access the fflow instance-->
    <div>
        <button [disabled]="!fi.canSubmit()" [form-flow-submit]="fi">Submit</button>
        <button [disabled]="!fi.dirty()" (click)="fi.reset()">Reset</button>
    </div>


```