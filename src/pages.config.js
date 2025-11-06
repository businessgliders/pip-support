import IntakeForm from './pages/IntakeForm';
import TicketBoard from './pages/TicketBoard';
import Layout from './Layout.jsx';


export const PAGES = {
    "IntakeForm": IntakeForm,
    "TicketBoard": TicketBoard,
}

export const pagesConfig = {
    mainPage: "IntakeForm",
    Pages: PAGES,
    Layout: Layout,
};