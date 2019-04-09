import {NgModule, Type} from "@angular/core"
import { Routes, RouterModule } from "@angular/router";
import { DemoForm } from "./demo-form.cmp";

export const routes : Routes = [
    {path: "", component: DemoForm, pathMatch: "full"}
]

@NgModule({
    imports:[RouterModule.forRoot(routes)],
    exports:[RouterModule]
})
export class AppRouting {

}