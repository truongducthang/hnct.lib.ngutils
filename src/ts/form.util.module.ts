import { NgModule } from "@angular/core";
import { FormFlow, FormFlowSubmit } from "./form.flow";
import { FormError, FormCoordinator } from "./form.errors";

@NgModule({
    declarations: [FormError, FormCoordinator, FormFlow, FormFlowSubmit],
    exports: [FormError, FormCoordinator, FormFlow, FormFlowSubmit]
})
export class FormUtilModule {

}